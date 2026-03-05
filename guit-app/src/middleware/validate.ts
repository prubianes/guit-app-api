import type { MiddlewareHandler } from 'hono';
import { AppError } from '../libs/errors';
import type { ZodType } from 'zod';

const JSON_KEY = 'validated:json';
const PARAMS_KEY = 'validated:params';
const QUERY_KEY = 'validated:query';

function parseOrThrow<T>(schema: ZodType<T>, value: unknown, source: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `Invalid ${source}`,
      details: result.error.issues,
    });
  }

  return result.data;
}

export function validateJson<T>(schema: ZodType<T>): MiddlewareHandler {
  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new AppError({
        status: 400,
        code: 'INVALID_JSON',
        message: 'Malformed JSON body',
      });
    }

    const parsed = parseOrThrow(schema, body, 'request body');
    c.set(JSON_KEY, parsed);
    await next();
  };
}

export function validateParams<T>(schema: ZodType<T>): MiddlewareHandler {
  return async (c, next) => {
    const parsed = parseOrThrow(schema, c.req.param(), 'path parameters');
    c.set(PARAMS_KEY, parsed);
    await next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): MiddlewareHandler {
  return async (c, next) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const parsed = parseOrThrow(schema, query, 'query parameters');
    c.set(QUERY_KEY, parsed);
    await next();
  };
}

export function getValidatedJson<T>(c: Parameters<MiddlewareHandler>[0]): T {
  return c.get(JSON_KEY) as T;
}

export function getValidatedParams<T>(c: Parameters<MiddlewareHandler>[0]): T {
  return c.get(PARAMS_KEY) as T;
}

export function getValidatedQuery<T>(c: Parameters<MiddlewareHandler>[0]): T {
  return c.get(QUERY_KEY) as T;
}
