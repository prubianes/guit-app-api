import app from '../app';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../libs/prisma';

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
});
