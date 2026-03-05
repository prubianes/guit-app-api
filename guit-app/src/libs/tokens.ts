import crypto from 'node:crypto';
import { AppError } from './errors';

type TokenType = 'access' | 'refresh';

type TokenPayload = {
  sub: number;
  type: TokenType;
  exp: number;
};

const TOKEN_ALG = 'HS256';

function getTokenSecret() {
  return process.env.AUTH_JWT_SECRET || 'dev-insecure-secret-change-me';
}

function getAccessTtlSeconds() {
  return Number.parseInt(process.env.AUTH_ACCESS_TTL_SECONDS ?? '900', 10);
}

function getRefreshTtlSeconds() {
  return Number.parseInt(process.env.AUTH_REFRESH_TTL_SECONDS ?? '604800', 10);
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(input: string) {
  return crypto.createHmac('sha256', getTokenSecret()).update(input).digest('base64url');
}

function createToken(type: TokenType, userId: number) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = type === 'access' ? getAccessTtlSeconds() : getRefreshTtlSeconds();

  const header = base64UrlEncode(JSON.stringify({ alg: TOKEN_ALG, typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      type,
      exp: now + ttl,
    } satisfies TokenPayload)
  );
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

export function issueTokenPair(userId: number) {
  return {
    accessToken: createToken('access', userId),
    refreshToken: createToken('refresh', userId),
    tokenType: 'Bearer' as const,
    accessTokenExpiresIn: getAccessTtlSeconds(),
    refreshTokenExpiresIn: getRefreshTtlSeconds(),
  };
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function verifyRawToken(token: string): TokenPayload {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    });
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);

  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token signature',
    });
  }

  let decoded: TokenPayload;
  try {
    decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
  } catch {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token payload',
    });
  }

  if (!decoded.sub || !decoded.exp || !decoded.type) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token claims',
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp <= now) {
    throw new AppError({
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Token expired',
    });
  }

  return decoded;
}

export function verifyAccessToken(token: string) {
  const payload = verifyRawToken(token);
  if (payload.type !== 'access') {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN_TYPE',
      message: 'Invalid token type',
    });
  }

  return payload;
}

export function verifyRefreshToken(token: string) {
  const payload = verifyRawToken(token);
  if (payload.type !== 'refresh') {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN_TYPE',
      message: 'Invalid token type',
    });
  }

  return payload;
}
