import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { jsonError } from './http';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof HTTPException) {
    return new AppError({
      status: error.status,
      code: 'HTTP_EXCEPTION',
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }

  return new AppError({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}

export function renderError(c: Context, error: unknown) {
  const normalized = normalizeError(error);
  const status = toContentfulStatus(normalized.status);

  return jsonError(c, {
    status,
    code: normalized.code,
    message: normalized.message,
    details: normalized.details,
  });
}

function toContentfulStatus(status: number): ContentfulStatusCode {
  if (status === 204 || status === 205 || status === 304) {
    return 500;
  }

  return status as ContentfulStatusCode;
}
