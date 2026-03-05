import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ApiMeta = Record<string, unknown>;

export type ApiSuccess<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  // Transitional fields to keep current clients/tests working during migration.
  statusCode?: number;
  message?: string;
};

export function jsonSuccess<T>(
  c: Context,
  data: T,
  init?: {
    status?: ContentfulStatusCode;
    meta?: ApiMeta;
  }
) {
  const body: ApiSuccess<T> = {
    data,
  };

  if (init?.meta) {
    body.meta = init.meta;
  }

  return c.json(body, init?.status ?? 200);
}

export function jsonError(
  c: Context,
  init: {
    status: ContentfulStatusCode;
    code: string;
    message: string;
    details?: unknown;
  }
) {
  const body: ApiFailure = {
    error: {
      code: init.code,
      message: init.message,
      details: init.details,
    },
    statusCode: init.status,
    message: init.message,
  };

  return c.json(body, init.status);
}
