import { Hono } from 'hono';
import { AppError } from '../libs/errors';
import { jsonSuccess } from '../libs/http';
import { prisma } from '../libs/prisma';
import { issueTokenPair, verifyRefreshToken } from '../libs/tokens';
import { getAuth, requireAuth } from '../middleware/auth';
import { getValidatedJson, validateJson } from '../middleware/validate';
import {
  authLoginSchema,
  authRefreshSchema,
  authRegisterSchema,
  type AuthLoginInput,
  type AuthRefreshInput,
  type AuthRegisterInput,
} from '../libs/schemas';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const v2 = new Hono();

v2.post('/auth/register', validateJson(authRegisterSchema), async (c) => {
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

    return jsonSuccess(
      c,
      {
        user,
        tokens: issueTokenPair(user.id),
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

v2.post('/auth/login', validateJson(authLoginSchema), async (c) => {
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

  return jsonSuccess(c, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    tokens: issueTokenPair(user.id),
  });
});

v2.post('/auth/refresh', validateJson(authRefreshSchema), async (c) => {
  const body = getValidatedJson<AuthRefreshInput>(c);
  const tokenPayload = verifyRefreshToken(body.refreshToken);

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

  return jsonSuccess(c, {
    tokens: issueTokenPair(user.id),
  });
});

v2.get('/me', requireAuth, async (c) => {
  const auth = getAuth(c);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError({
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  }

  return jsonSuccess(c, user);
});

export default v2;
