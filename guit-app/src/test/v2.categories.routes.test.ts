import app from '../app';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../libs/prisma';

type AuthFixture = {
  userId: number;
  accessToken: string;
  email: string;
};

let userA: AuthFixture;
let userB: AuthFixture;
let categoryId: number;

async function registerFixture(prefix: string): Promise<AuthFixture> {
  const email = `${prefix}-${Date.now()}@example.com`;
  const response = await app.request('/api/v2/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: prefix,
      email,
      password: 'password123',
    }),
  });

  const body = await response.json();
  return {
    userId: body.data.user.id,
    accessToken: body.data.tokens.accessToken,
    email,
  };
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

beforeAll(async () => {
  userA = await registerFixture('cat-a');
  userB = await registerFixture('cat-b');
});

afterAll(async () => {
  await prisma.transaction.deleteMany({
    where: { userId: { in: [userA?.userId, userB?.userId].filter(Boolean) as number[] } },
  });
  await prisma.budget.deleteMany({
    where: { userId: { in: [userA?.userId, userB?.userId].filter(Boolean) as number[] } },
  });
  await prisma.category.deleteMany({
    where: { userId: { in: [userA?.userId, userB?.userId].filter(Boolean) as number[] } },
  });
  await prisma.account.deleteMany({
    where: { userId: { in: [userA?.userId, userB?.userId].filter(Boolean) as number[] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA?.userId, userB?.userId].filter(Boolean) as number[] } },
  });
});

describe('V2 me/categories routes', () => {
  it('requires auth', async () => {
    const response = await app.request('/api/v2/me/categories', { method: 'GET' });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });

  it('creates category for the authenticated user', async () => {
    const response = await app.request('/api/v2/me/categories', {
      method: 'POST',
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        name: 'Food',
        type: 'expense',
      }),
    });

    const body = await response.json();
    categoryId = body.data.id;
    expect(response.status).toBe(201);
    expect(body).toHaveProperty('data.name', 'Food');
    expect(body).toHaveProperty('data.type', 'expense');
    expect(body).toHaveProperty('data.userId', userA.userId);
  });

  it('lists only own categories', async () => {
    await app.request('/api/v2/me/categories', {
      method: 'POST',
      headers: authHeaders(userB.accessToken),
      body: JSON.stringify({
        name: 'Salary',
        type: 'income',
      }),
    });

    const response = await app.request('/api/v2/me/categories', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userA.accessToken}`,
      },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.every((category: { userId: number }) => category.userId === userA.userId)).toBe(true);
  });

  it('prevents duplicate category name/type per user', async () => {
    const response = await app.request('/api/v2/me/categories', {
      method: 'POST',
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        name: 'Food',
        type: 'expense',
      }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'CATEGORY_ALREADY_EXISTS');
  });

  it('allows same category name/type for another user', async () => {
    const response = await app.request('/api/v2/me/categories', {
      method: 'POST',
      headers: authHeaders(userB.accessToken),
      body: JSON.stringify({
        name: 'Food',
        type: 'expense',
      }),
    });

    expect(response.status).toBe(201);
  });

  it('retrieves, updates and deletes own category', async () => {
    const getResponse = await app.request(`/api/v2/me/categories/${categoryId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userA.accessToken}`,
      },
    });
    expect(getResponse.status).toBe(200);

    const updateResponse = await app.request(`/api/v2/me/categories/${categoryId}`, {
      method: 'PUT',
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        name: 'Groceries',
      }),
    });
    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody).toHaveProperty('data.name', 'Groceries');

    const deleteResponse = await app.request(`/api/v2/me/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userA.accessToken}`,
      },
    });
    expect(deleteResponse.status).toBe(200);
  });

  it('returns 404 when accessing another user category', async () => {
    const createResponse = await app.request('/api/v2/me/categories', {
      method: 'POST',
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        name: 'Transport',
        type: 'expense',
      }),
    });
    const createBody = await createResponse.json();
    const userACategoryId = createBody.data.id;

    const response = await app.request(`/api/v2/me/categories/${userACategoryId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userB.accessToken}`,
      },
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'CATEGORY_NOT_FOUND');
  });

  it('returns validation error for invalid id', async () => {
    const response = await app.request('/api/v2/me/categories/not-a-number', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userA.accessToken}`,
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });
});
