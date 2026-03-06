import type { MiddlewareHandler } from 'hono';
import { AppError } from '../libs/errors';
import { verifyAccessToken } from '../libs/tokens';

export type AuthContext = {
  userId: number;
};

const AUTH_KEY = 'auth';

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!bearerToken) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const tokenPayload = await verifyAccessToken(bearerToken);
  const userId = tokenPayload.sub;

  c.set(AUTH_KEY, { userId } satisfies AuthContext);
  await next();
};

export function getAuth(c: Parameters<MiddlewareHandler>[0]): AuthContext {
  const auth = c.get(AUTH_KEY) as AuthContext | undefined;

  if (!auth) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return auth;
}
