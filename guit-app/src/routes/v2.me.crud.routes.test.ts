import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../libs/prisma';

type AuthFixture = {
  userId: number;
  email: string;
  accessToken: string;
};

let user: AuthFixture;
let categoryId: number;
let accountId: number;
let budgetId: number;
let transactionId: number;

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
    email,
    accessToken: body.data.tokens.accessToken,
  };
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

beforeAll(async () => {
  user = await registerFixture('v2-crud');

  const categoryResponse = await app.request('/api/v2/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `v2-crud-cat-${Date.now()}`,
      type: 'income',
    }),
  });
  const categoryBody = await categoryResponse.json();
  categoryId = categoryBody.data.id;
});

afterAll(async () => {
  await prisma.transaction.deleteMany({
    where: {
      id: {
        in: [transactionId].filter(Boolean) as number[],
      },
    },
  });

  await prisma.budget.deleteMany({
    where: {
      id: {
        in: [budgetId].filter(Boolean) as number[],
      },
    },
  });

  await prisma.account.deleteMany({
    where: {
      id: {
        in: [accountId].filter(Boolean) as number[],
      },
    },
  });

  if (categoryId) {
    await prisma.category.delete({
      where: { id: categoryId },
    }).catch(() => undefined);
  }

  if (user?.userId) {
    await prisma.refreshSession.deleteMany({
      where: { userId: user.userId },
    });

    await prisma.user.delete({
      where: { id: user.userId },
    }).catch(() => undefined);
  }
});

describe('V2 /me CRUD and failure paths', () => {
  it('rejects protected route without bearer token', async () => {
    const response = await app.request('/api/v2/me/accounts', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'UNAUTHORIZED');
  });

  it('creates, reads, updates and deletes account', async () => {
    const createResponse = await app.request('/api/v2/me/accounts', {
      method: 'POST',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        name: 'Main',
        type: 'Checking',
        balance: 1000,
      }),
    });
    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    accountId = createBody.data.id;

    const listResponse = await app.request('/api/v2/me/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((account: { id: number }) => account.id === accountId)).toBe(true);

    const getResponse = await app.request(`/api/v2/me/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(getResponse.status).toBe(200);

    const patchResponse = await app.request(`/api/v2/me/accounts/${accountId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        name: 'Main Updated',
      }),
    });
    expect(patchResponse.status).toBe(200);
    const patchBody = await patchResponse.json();
    expect(patchBody).toHaveProperty('data.name', 'Main Updated');
  });

  it('returns validation and not-found for account errors', async () => {
    const invalidIdResponse = await app.request('/api/v2/me/accounts/not-a-number', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(invalidIdResponse.status).toBe(400);

    const notFoundResponse = await app.request('/api/v2/me/accounts/999999', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(notFoundResponse.status).toBe(404);
    const notFoundBody = await notFoundResponse.json();
    expect(notFoundBody).toHaveProperty('error.code', 'ACCOUNT_NOT_FOUND');

    const invalidPatchResponse = await app.request(`/api/v2/me/accounts/${accountId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({}),
    });
    expect(invalidPatchResponse.status).toBe(400);
    const invalidPatchBody = await invalidPatchResponse.json();
    expect(invalidPatchBody).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });

  it('creates, reads, updates and deletes budget', async () => {
    const createResponse = await app.request('/api/v2/me/budgets', {
      method: 'POST',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        categoryId,
        amount: 200,
        period: 'monthly',
      }),
    });
    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    budgetId = createBody.data.id;

    const listResponse = await app.request('/api/v2/me/budgets', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(listResponse.status).toBe(200);

    const getResponse = await app.request(`/api/v2/me/budgets/${budgetId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(getResponse.status).toBe(200);

    const patchResponse = await app.request(`/api/v2/me/budgets/${budgetId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        amount: 250,
      }),
    });
    expect(patchResponse.status).toBe(200);
    const patchBody = await patchResponse.json();
    expect(patchBody).toHaveProperty('data.amount', 250);

    const invalidPatchResponse = await app.request(`/api/v2/me/budgets/${budgetId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({}),
    });
    expect(invalidPatchResponse.status).toBe(400);

    const deleteResponse = await app.request(`/api/v2/me/budgets/${budgetId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(deleteResponse.status).toBe(200);
    budgetId = 0;

    const deleteNotFoundResponse = await app.request(`/api/v2/me/budgets/${budgetId + 99999}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(deleteNotFoundResponse.status).toBe(404);
  });

  it('handles transaction errors and full lifecycle with balance updates', async () => {
    const missingAccountResponse = await app.request('/api/v2/me/transactions', {
      method: 'POST',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        accountId: 999999,
        categoryId,
        amount: 50,
        type: 'expense',
        date: new Date().toISOString(),
        description: 'missing-account',
      }),
    });
    expect(missingAccountResponse.status).toBe(404);
    const missingAccountBody = await missingAccountResponse.json();
    expect(missingAccountBody).toHaveProperty('error.code', 'ACCOUNT_NOT_FOUND');

    const missingCategoryResponse = await app.request('/api/v2/me/transactions', {
      method: 'POST',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        accountId,
        categoryId: 999999,
        amount: 50,
        type: 'expense',
        date: new Date().toISOString(),
        description: 'missing-category',
      }),
    });
    expect(missingCategoryResponse.status).toBe(404);
    const missingCategoryBody = await missingCategoryResponse.json();
    expect(missingCategoryBody).toHaveProperty('error.code', 'CATEGORY_NOT_FOUND');

    const createResponse = await app.request('/api/v2/me/transactions', {
      method: 'POST',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        accountId,
        categoryId,
        amount: 200,
        type: 'income',
        date: new Date().toISOString(),
        description: 'salary',
      }),
    });
    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    transactionId = createBody.data.id;

    const accountAfterCreate = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });
    expect(accountAfterCreate?.balance).toBe(1200);

    const patchMissingCategoryResponse = await app.request(`/api/v2/me/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        categoryId: 999999,
      }),
    });
    expect(patchMissingCategoryResponse.status).toBe(404);

    const patchResponse = await app.request(`/api/v2/me/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: authHeaders(user.accessToken),
      body: JSON.stringify({
        amount: 50,
        type: 'expense',
      }),
    });
    expect(patchResponse.status).toBe(200);

    const accountAfterPatch = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });
    expect(accountAfterPatch?.balance).toBe(950);

    const deleteResponse = await app.request(`/api/v2/me/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(deleteResponse.status).toBe(200);
    transactionId = 0;

    const accountAfterDelete = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });
    expect(accountAfterDelete?.balance).toBe(1000);

    const notFoundResponse = await app.request('/api/v2/me/transactions/999999', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(notFoundResponse.status).toBe(404);
  });

  it('deletes account and returns not found after delete', async () => {
    const deleteResponse = await app.request(`/api/v2/me/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(deleteResponse.status).toBe(200);

    const getAfterDeleteResponse = await app.request(`/api/v2/me/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    expect(getAfterDeleteResponse.status).toBe(404);
    accountId = 0;
  });
});
