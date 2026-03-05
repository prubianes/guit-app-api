import { jwtVerify, SignJWT, errors } from 'jose';
import { AppError } from './errors';

type TokenType = 'access' | 'refresh';

type TokenPayload = {
  sub: string;
  type: TokenType;
  exp: number;
};

const TOKEN_ALG = 'HS256';

function getTokenSecretBytes() {
  const secret = process.env.AUTH_JWT_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(secret);
}

function getAccessTtlSeconds() {
  return Number.parseInt(process.env.AUTH_ACCESS_TTL_SECONDS ?? '900', 10);
}

function getRefreshTtlSeconds() {
  return Number.parseInt(process.env.AUTH_REFRESH_TTL_SECONDS ?? '604800', 10);
}

async function createToken(type: TokenType, userId: number) {
  const ttl = type === 'access' ? getAccessTtlSeconds() : getRefreshTtlSeconds();
  return new SignJWT({ type })
    .setProtectedHeader({ alg: TOKEN_ALG, typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getTokenSecretBytes());
}

export async function issueTokenPair(userId: number) {
  return {
    accessToken: await createToken('access', userId),
    refreshToken: await createToken('refresh', userId),
    tokenType: 'Bearer' as const,
    accessTokenExpiresIn: getAccessTtlSeconds(),
    refreshTokenExpiresIn: getRefreshTtlSeconds(),
  };
}

async function verifyRawToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getTokenSecretBytes(), {
      algorithms: [TOKEN_ALG],
    });

    const subject = payload.sub;
    const type = payload.type;
    const exp = payload.exp;

    if (
      typeof subject !== 'string' ||
      (type !== 'access' && type !== 'refresh') ||
      typeof exp !== 'number'
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
  };
}
