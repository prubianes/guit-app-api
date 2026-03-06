import app from '../app';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../libs/prisma';
import { SignJWT } from 'jose';

const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length === 0) return;
  await prisma.user.deleteMany({
    where: {
      email: {
        in: createdEmails,
      },
    },
  });
});

describe('V2 Auth Routes', () => {
  it('registers and returns user + tokens', async () => {
    const email = `v2-register-${Date.now()}@example.com`;
    createdEmails.push(email);

    const response = await app.request('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'V2 User',
        email,
        password: 'password123',
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toHaveProperty('data.user.email', email);
    expect(body).toHaveProperty('data.tokens.accessToken');
    expect(body).toHaveProperty('data.tokens.refreshToken');
  });

  it('logs in and returns user + tokens', async () => {
    const email = `v2-login-${Date.now()}@example.com`;
    createdEmails.push(email);

    await app.request('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Login User',
        email,
        password: 'password123',
      }),
    });

    const response = await app.request('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('data.user.email', email);
    expect(body).toHaveProperty('data.tokens.accessToken');
    expect(body).toHaveProperty('data.tokens.refreshToken');
  });

  it('rejects invalid credentials', async () => {
    const response = await app.request('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing@example.com',
        password: 'wrong',
      }),
    });

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body).toHaveProperty('error.code', 'INVALID_CREDENTIALS');
  });

  it('refreshes tokens', async () => {
    const email = `v2-refresh-${Date.now()}@example.com`;
    createdEmails.push(email);

    const registerResponse = await app.request('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Refresh User',
        email,
        password: 'password123',
      }),
    });
    const registerBody = await registerResponse.json();

    const refreshResponse = await app.request('/api/v2/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: registerBody.data.tokens.refreshToken,
      }),
    });

    const refreshBody = await refreshResponse.json();
    expect(refreshResponse.status).toBe(200);
    expect(refreshBody).toHaveProperty('data.tokens.accessToken');
    expect(refreshBody).toHaveProperty('data.tokens.refreshToken');
  });

  it('rejects reuse of rotated refresh token', async () => {
    const email = `v2-rotate-${Date.now()}@example.com`;
    createdEmails.push(email);

    const registerResponse = await app.request('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rotate User',
        email,
        password: 'password123',
      }),
    });
    const registerBody = await registerResponse.json();
    const firstRefreshToken = registerBody.data.tokens.refreshToken;

    const firstRefreshResponse = await app.request('/api/v2/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: firstRefreshToken,
      }),
    });
    expect(firstRefreshResponse.status).toBe(200);

    const reusedRefreshResponse = await app.request('/api/v2/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: firstRefreshToken,
      }),
    });
    expect(reusedRefreshResponse.status).toBe(401);
    const reusedBody = await reusedRefreshResponse.json();
    expect(reusedBody).toHaveProperty('error.code', 'INVALID_REFRESH_SESSION');
  });

  it('returns me when authenticated with bearer token', async () => {
    const email = `v2-me-${Date.now()}@example.com`;
    createdEmails.push(email);

    const registerResponse = await app.request('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Me User',
        email,
        password: 'password123',
      }),
    });
    const registerBody = await registerResponse.json();
    const accessToken = registerBody.data.tokens.accessToken;

    const meResponse = await app.request('/api/v2/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const meBody = await meResponse.json();
    expect(meResponse.status).toBe(200);
    expect(meBody).toHaveProperty('data.email', email);
    expect(meBody.data).not.toHaveProperty('password');
  });

  it('rejects malformed bearer token on /me', async () => {
    const response = await app.request('/api/v2/me', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer definitely-not-a-jwt',
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'INVALID_TOKEN');
  });

  it('rejects expired bearer token on /me', async () => {
    const secret = process.env.AUTH_JWT_SECRET || 'dev-insecure-secret-change-me';
    const issuer = process.env.AUTH_JWT_ISSUER ?? 'guit-app-api';
    const audience = process.env.AUTH_JWT_AUDIENCE ?? 'guit-app-client';
    const key = new TextEncoder().encode(secret);

    const expiredToken = await new SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('1')
      .setIssuer(issuer)
      .setAudience(audience)
      .setJti('expired-test-token')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(key);

    const response = await app.request('/api/v2/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'TOKEN_EXPIRED');
  });

  it('rate limits repeated login attempts from the same ip', async () => {
    const previousMax = process.env.AUTH_RATE_LIMIT_MAX;
    const previousWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await app.request('/api/v2/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.77',
          },
          body: JSON.stringify({
            email: 'missing@example.com',
            password: 'wrong',
          }),
        });

        if (attempt < 3) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429);
          const body = await response.json();
          expect(body).toHaveProperty('error.code', 'RATE_LIMITED');
        }
      }
    } finally {
      if (previousMax === undefined) delete process.env.AUTH_RATE_LIMIT_MAX;
      else process.env.AUTH_RATE_LIMIT_MAX = previousMax;

      if (previousWindow === undefined) delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
      else process.env.AUTH_RATE_LIMIT_WINDOW_MS = previousWindow;
    }
  });
});
