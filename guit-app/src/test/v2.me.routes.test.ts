import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../libs/prisma';

type AuthFixture = {
  userId: number;
  email: string;
  accessToken: string;
};

let userA: AuthFixture;
let userB: AuthFixture;
let categoryId: number;
let accountAId: number;
let accountBId: number;
let transactionAId: number;
let budgetAId: number;

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

beforeAll(async () => {
  userA = await registerFixture('v2-a');
  userB = await registerFixture('v2-b');

  const categoryResponse = await app.request('/api/v2/me/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.accessToken}`,
    },
    body: JSON.stringify({
      name: `v2-cat-${Date.now()}`,
      type: 'expense',
    }),
  });
  const categoryBody = await categoryResponse.json();
  categoryId = categoryBody.data.id;

  const accountAResponse = await app.request('/api/v2/me/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.accessToken}`,
    },
    body: JSON.stringify({
      name: 'Account A',
      type: 'Checking',
      balance: 1000,
    }),
  });
  const accountABody = await accountAResponse.json();
  accountAId = accountABody.data.id;

  const accountBResponse = await app.request('/api/v2/me/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userB.accessToken}`,
    },
    body: JSON.stringify({
      name: 'Account B',
      type: 'Checking',
      balance: 500,
    }),
  });
  const accountBBody = await accountBResponse.json();
  accountBId = accountBBody.data.id;
});

afterAll(async () => {
  await prisma.transaction.deleteMany({
    where: {
      id: {
        in: [transactionAId].filter(Boolean) as number[],
      },
    },
  });
  await prisma.budget.deleteMany({
    where: {
      id: {
        in: [budgetAId].filter(Boolean) as number[],
      },
    },
  });
  await prisma.account.deleteMany({
    where: {
      id: {
        in: [accountAId, accountBId].filter(Boolean) as number[],
      },
    },
  });
  if (categoryId) {
    await prisma.category.delete({
      where: { id: categoryId },
    }).catch(() => undefined);
  }
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userA?.userId, userB?.userId].filter(Boolean) as number[],
      },
    },
  });
});

describe('V2 /me resource ownership', () => {
  it('does not allow user B to read user A account', async () => {
    const response = await app.request(`/api/v2/me/accounts/${accountAId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userB.accessToken}`,
      },
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'ACCOUNT_NOT_FOUND');
  });

  it('creates transaction for own account and blocks cross-user read', async () => {
    const createResponse = await app.request('/api/v2/me/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.accessToken}`,
      },
      body: JSON.stringify({
        accountId: accountAId,
        categoryId,
        amount: 100,
        type: 'expense',
        date: new Date().toISOString(),
        description: 'tx-a',
      }),
    });
    const createBody = await createResponse.json();
    transactionAId = createBody.data.id;
    expect(createResponse.status).toBe(201);

    const blockedResponse = await app.request(`/api/v2/me/transactions/${transactionAId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userB.accessToken}`,
      },
    });
    expect(blockedResponse.status).toBe(404);
    const blockedBody = await blockedResponse.json();
    expect(blockedBody).toHaveProperty('error.code', 'TRANSACTION_NOT_FOUND');
  });

  it('blocks creating transaction against another user account', async () => {
    const response = await app.request('/api/v2/me/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.accessToken}`,
      },
      body: JSON.stringify({
        accountId: accountAId,
        categoryId,
        amount: 50,
        type: 'expense',
        date: new Date().toISOString(),
        description: 'forbidden',
      }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error.code', 'ACCOUNT_NOT_FOUND');
  });

  it('creates budget for own user and blocks cross-user read', async () => {
    const createResponse = await app.request('/api/v2/me/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.accessToken}`,
      },
      body: JSON.stringify({
        categoryId,
        amount: 300,
        period: 'monthly',
      }),
    });

    const createBody = await createResponse.json();
    budgetAId = createBody.data.id;
    expect(createResponse.status).toBe(201);

    const blockedResponse = await app.request(`/api/v2/me/budgets/${budgetAId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userB.accessToken}`,
      },
    });
    expect(blockedResponse.status).toBe(404);
    const blockedBody = await blockedResponse.json();
    expect(blockedBody).toHaveProperty('error.code', 'BUDGET_NOT_FOUND');
  });
});
