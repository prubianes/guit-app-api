import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { AppError, normalizeError, renderError } from '../libs/errors';
import {
  getValidatedJson,
  getValidatedParams,
  getValidatedQuery,
  validateJson,
  validateParams,
  validateQuery,
} from '../middleware/validate';

describe('errors helpers', () => {
  it('keeps AppError unchanged in normalizeError', () => {
    const appError = new AppError({
      status: 409,
      code: 'CONFLICT',
      message: 'Conflict',
      details: { field: 'email' },
    });

    const normalized = normalizeError(appError);
    expect(normalized).toBe(appError);
  });

  it('maps HTTPException to AppError', () => {
    const normalized = normalizeError(new HTTPException(418, { message: 'Teapot' }));
    expect(normalized.status).toBe(418);
    expect(normalized.code).toBe('HTTP_EXCEPTION');
    expect(normalized.message).toContain('Teapot');
  });

  it('maps generic Error to INTERNAL_ERROR', () => {
    const normalized = normalizeError(new Error('Boom'));
    expect(normalized.status).toBe(500);
    expect(normalized.code).toBe('INTERNAL_ERROR');
    expect(normalized.message).toBe('Boom');
  });

  it('maps unknown values to INTERNAL_ERROR', () => {
    const normalized = normalizeError({ unexpected: true });
    expect(normalized.status).toBe(500);
    expect(normalized.code).toBe('INTERNAL_ERROR');
    expect(normalized.message).toBe('Internal server error');
  });

  it('renderError maps invalid contentless status to 500 and preserves details', async () => {
    const app = new Hono();

    app.get('/contentless', () => {
      throw new AppError({
        status: 204,
        code: 'CONTENTLESS_STATUS',
        message: 'Should become 500',
        details: { reason: 'invalid response body status' },
      });
    });

    app.onError((err, c) => renderError(c, err));

    const response = await app.request('/contentless');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'CONTENTLESS_STATUS');
    expect(body).toHaveProperty('error.details.reason', 'invalid response body status');
  });
});

describe('validate middleware', () => {
  const app = new Hono();

  app.onError((err, c) => renderError(c, err));

  app.post('/json', validateJson(z.object({ name: z.string().min(1) })), (c) => {
    const body = getValidatedJson<{ name: string }>(c);
    return c.json({ ok: true, name: body.name });
  });

  app.get('/params/:id', validateParams(z.object({ id: z.coerce.number().int().positive() })), (c) => {
    const params = getValidatedParams<{ id: number }>(c);
    return c.json({ id: params.id });
  });

  app.get('/query', validateQuery(z.object({ limit: z.coerce.number().int().positive() })), (c) => {
    const query = getValidatedQuery<{ limit: number }>(c);
    return c.json({ limit: query.limit });
  });

  it('accepts valid json body and exposes parsed payload', async () => {
    const response = await app.request('/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, name: 'Alice' });
  });

  it('returns INVALID_JSON on malformed json body', async () => {
    const response = await app.request('/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Alice"',
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'INVALID_JSON');
  });

  it('returns VALIDATION_ERROR for invalid json schema', async () => {
    const response = await app.request('/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });

  it('accepts valid path params and exposes parsed params', async () => {
    const response = await app.request('/params/12');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ id: 12 });
  });

  it('returns VALIDATION_ERROR for invalid path params', async () => {
    const response = await app.request('/params/not-a-number');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });

  it('accepts valid query params and exposes parsed query', async () => {
    const response = await app.request('/query?limit=25');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ limit: 25 });
  });

  it('returns VALIDATION_ERROR for invalid query params', async () => {
    const response = await app.request('/query?limit=0');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });
});
