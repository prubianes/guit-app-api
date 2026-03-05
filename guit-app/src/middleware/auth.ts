import type { MiddlewareHandler } from 'hono';
import { AppError } from '../libs/errors';

export type AuthContext = {
  userId: number;
};

const AUTH_KEY = 'auth';

/**
 * Base auth contract for new routes.
 * Temporary strategy: accepts `x-user-id` header until JWT flow lands.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const userIdHeader = c.req.header('x-user-id');
  const parsedUserId = Number.parseInt(userIdHeader ?? '', 10);

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  c.set(AUTH_KEY, { userId: parsedUserId } satisfies AuthContext);
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
