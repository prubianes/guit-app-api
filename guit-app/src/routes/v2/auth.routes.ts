import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import {
  authLoginSchema,
  authRefreshSchema,
  authRegisterSchema,
  type AuthLoginInput,
  type AuthRefreshInput,
  type AuthRegisterInput,
} from '../../libs/schemas';
import { issueTokenPair, verifyRefreshToken } from '../../libs/tokens';
import { getValidatedJson, validateJson } from '../../middleware/validate';
import { authRateLimit } from '../../middleware/rate-limit';

const authRoutes = new Hono();

function toPublicTokenResponse(tokens: {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
  };
}

authRoutes.post('/register', authRateLimit(), validateJson(authRegisterSchema), async (c) => {
  const body = getValidatedJson<AuthRegisterInput>(c);

  try {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokenPair = await issueTokenPair(user.id);
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenId: tokenPair.refreshTokenId,
        expiresAt: tokenPair.refreshTokenExpiresAt,
      },
    });

    return jsonSuccess(
      c,
      {
        user,
        tokens: toPublicTokenResponse(tokenPair),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError({
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already exists',
      });
    }

    throw error;
  }
});

authRoutes.post('/login', authRateLimit(), validateJson(authLoginSchema), async (c) => {
  const body = getValidatedJson<AuthLoginInput>(c);

  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    throw new AppError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  const passwordMatches = await bcrypt.compare(body.password, user.password);
  if (!passwordMatches) {
    throw new AppError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  const tokenPair = await issueTokenPair(user.id);
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenId: tokenPair.refreshTokenId,
      expiresAt: tokenPair.refreshTokenExpiresAt,
    },
  });

  return jsonSuccess(c, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tokens: toPublicTokenResponse(tokenPair),
  });
});

authRoutes.post('/refresh', authRateLimit(), validateJson(authRefreshSchema), async (c) => {
  const body = getValidatedJson<AuthRefreshInput>(c);
  const tokenPayload = await verifyRefreshToken(body.refreshToken);

  const session = await prisma.refreshSession.findUnique({
    where: { tokenId: tokenPayload.tokenId },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (
    !session ||
    session.userId !== tokenPayload.sub ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError({
      status: 401,
      code: 'INVALID_REFRESH_SESSION',
      message: 'Refresh session is invalid or revoked',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.sub },
    select: { id: true },
  });

  if (!user) {
    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid token subject',
    });
  }

  const tokenPair = await issueTokenPair(user.id);
  await prisma.$transaction(async (tx) => {
    await tx.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await tx.refreshSession.create({
      data: {
        userId: user.id,
        tokenId: tokenPair.refreshTokenId,
        expiresAt: tokenPair.refreshTokenExpiresAt,
      },
    });
  });

  return jsonSuccess(c, {
    tokens: toPublicTokenResponse(tokenPair),
  });
});

export default authRoutes;
