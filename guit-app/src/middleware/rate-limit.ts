import type { MiddlewareHandler } from 'hono';
import { AppError } from '../libs/errors';

type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function authRateLimit(): MiddlewareHandler {
  return async (c, next) => {
    const maxRequests = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '20', 10);
    const windowMs = Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? '60000', 10);

    const ip = getClientIp(c.req.raw.headers);
    const key = `${ip}:${new URL(c.req.url).pathname}`;
    const now = Date.now();

    const current = buckets.get(key);
    if (!current || current.resetAtMs <= now) {
      buckets.set(key, {
        count: 1,
        resetAtMs: now + windowMs,
      });
      await next();
      return;
    }

    current.count += 1;
    if (current.count > maxRequests) {
      throw new AppError({
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests, please retry later',
        details: {
          retryAfterMs: current.resetAtMs - now,
        },
      });
    }

    await next();
  };
}
