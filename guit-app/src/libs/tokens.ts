import crypto from 'node:crypto';
import { jwtVerify, SignJWT, errors } from 'jose';
import { AppError } from './errors';

type TokenType = 'access' | 'refresh';

type TokenPayload = {
  sub: string;
  type: TokenType;
  exp: number;
  jti: string;
};

const TOKEN_ALG = 'HS256';

function getTokenSecretBytes() {
  const secret = process.env.AUTH_JWT_SECRET || 'dev-insecure-secret-change-me';
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (nodeEnv !== 'development' && nodeEnv !== 'test' && secret === 'dev-insecure-secret-change-me') {
    throw new AppError({
      status: 500,
      code: 'AUTH_CONFIG_ERROR',
      message: 'AUTH_JWT_SECRET must be configured for non-development environments',
    });
  }

  return new TextEncoder().encode(secret);
}

function getAccessTtlSeconds() {
  return Number.parseInt(process.env.AUTH_ACCESS_TTL_SECONDS ?? '900', 10);
}

function getRefreshTtlSeconds() {
  return Number.parseInt(process.env.AUTH_REFRESH_TTL_SECONDS ?? '604800', 10);
}

function getTokenIssuer() {
  return process.env.AUTH_JWT_ISSUER ?? 'guit-app-api';
}

function getTokenAudience() {
  return process.env.AUTH_JWT_AUDIENCE ?? 'guit-app-client';
}

async function createToken(type: TokenType, userId: number) {
  const ttl = type === 'access' ? getAccessTtlSeconds() : getRefreshTtlSeconds();
  const tokenId = crypto.randomUUID();
  const token = await new SignJWT({ type })
    .setProtectedHeader({ alg: TOKEN_ALG, typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuer(getTokenIssuer())
    .setAudience(getTokenAudience())
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getTokenSecretBytes());

  return {
    token,
    tokenId,
    expiresAt: new Date(Date.now() + ttl * 1000),
  };
}

export async function issueTokenPair(userId: number) {
  const access = await createToken('access', userId);
  const refresh = await createToken('refresh', userId);

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    tokenType: 'Bearer' as const,
    accessTokenExpiresIn: getAccessTtlSeconds(),
    refreshTokenExpiresIn: getRefreshTtlSeconds(),
    refreshTokenId: refresh.tokenId,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

async function verifyRawToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getTokenSecretBytes(), {
      algorithms: [TOKEN_ALG],
      issuer: getTokenIssuer(),
      audience: getTokenAudience(),
    });

    const subject = payload.sub;
    const type = payload.type;
    const exp = payload.exp;
    const tokenId = payload.jti;

    if (
      typeof subject !== 'string' ||
      (type !== 'access' && type !== 'refresh') ||
      typeof exp !== 'number' ||
      typeof tokenId !== 'string'
    ) {
      throw new AppError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid token claims',
      });
    }

    return {
      sub: subject,
      type,
      exp,
      jti: tokenId,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof errors.JWTExpired) {
      throw new AppError({
        status: 401,
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });
    }

    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    });
  }
}

export async function verifyAccessToken(token: string) {
  const payload = await verifyRawToken(token);
  if (payload.type !== 'access') {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN_TYPE',
      message: 'Invalid token type',
    });
  }

  const userId = Number.parseInt(payload.sub, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token subject',
    });
  }

  return {
    ...payload,
    sub: userId,
    tokenId: payload.jti,
  };
}

export async function verifyRefreshToken(token: string) {
  const payload = await verifyRawToken(token);
  if (payload.type !== 'refresh') {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN_TYPE',
      message: 'Invalid token type',
    });
  }

  const userId = Number.parseInt(payload.sub, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token subject',
    });
  }

  return {
    ...payload,
    sub: userId,
    tokenId: payload.jti,
  };
}
