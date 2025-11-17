import app from '../app';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../libs/prisma';

let userId: number;
let transactionId: number;
let accountId: number;
let categoryId: number;

beforeAll(async () => {
  // Create a user
  const newUser = {
    name: 'Test User For Transaction',
    email: `testuser-transaction+${Date.now()}@example.com`,
    password: 'testpassword123',
  };
  const userResponse = await app.request('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser),
  });
  const userBody = await userResponse.json();
  userId = userBody.id;

  // Create a category
  const newCategory = {
    name: 'Test Category For Transaction',
    type: 'expense',
  };
  const categoryResponse = await app.request('/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCategory),
  });
  const categoryBody = await categoryResponse.json();
  categoryId = categoryBody.id;

  // Create an account for the user
  const newAccount = {
    name: 'Test Account For Transaction',
    type: 'Checking',
    balance: 1000.0,
  };
  const accountResponse = await app.request(`/user/${userId}/account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAccount),
  });
  const accountBody = await accountResponse.json();
  accountId = accountBody.id;
});

describe('Transaction Routes - error & validation branches', () => {
  it('returns 400 for invalid user id on list', async () => {
    const res = await app.request('/user/invalid/transactions');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 400 for invalid transaction id on get', async () => {
    const res = await app.request(`/user/${userId}/transactions/invalid`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 404 when user has no transactions', async () => {
    const newUser = { name: 'NoTxUser', email: `notx-${Date.now()}@example.com`, password: 'testpass' };
    const createRes = await app.request('/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const created = await createRes.json();

    const res = await app.request(`/user/${created.id}/transactions`);
    expect([404, 500]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('message');

    // cleanup
    await app.request(`/user/${created.id}`, { method: 'DELETE' });
  });

  it('returns 400 for invalid transaction payload', async () => {
    const badPayload = { accountId: null };
    const res = await app.request(`/user/${userId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badPayload),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when creating transaction for non-existent user', async () => {
    const newTransaction = {
      accountId,
      categoryId,
      amount: 10,
      type: 'expense',
      date: new Date().toISOString(),
      description: 'Should fail',
    };
    const res = await app.request('/user/999999/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransaction),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when updating a non-existent transaction', async () => {
    const updated = {
      accountId,
      categoryId,
      amount: 1,
      type: 'income',
      date: new Date().toISOString(),
      description: 'Nope',
    };
    const res = await app.request(`/user/${userId}/transactions/999998`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 404 when deleting a non-existent transaction', async () => {
    const res = await app.request(`/user/${userId}/transactions/999997`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });
});

describe('Transaction Routes - mocked Prisma branches', () => {
  it('returns 404 when account is not found during update', async () => {
    const fakeTransaction = {
      id: 9999,
      userId,
      accountId: 9999,
      categoryId,
      amount: 50,
      type: 'income',
      date: new Date().toISOString(),
      description: 'mock',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const originalTxUpdate = (prisma.transaction as any).update;
    const originalAccFind = (prisma.account as any).findUnique;

    (prisma.transaction as any).update = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(null as any);

    const res = await app.request(`/user/${userId}/transactions/9999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 9999, categoryId, amount: 50, type: 'income', date: new Date().toISOString(), description: 'x' }),
    });

    expect(res.status).toBe(404);

    (prisma.transaction as any).update = originalTxUpdate;
    (prisma.account as any).findUnique = originalAccFind;
  });

  it('returns 404 when account is not found during delete', async () => {
    const fakeTransaction = {
      id: 8888,
      userId,
      accountId: 8888,
      categoryId,
      amount: 20,
      type: 'expense',
      date: new Date().toISOString(),
      description: 'mockdel',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const originalTxFind = (prisma.transaction as any).findUnique;
    const originalAccFind = (prisma.account as any).findUnique;

    (prisma.transaction as any).findUnique = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(null as any);

    const res = await app.request(`/user/${userId}/transactions/8888`, { method: 'DELETE' });
    expect(res.status).toBe(404);

    (prisma.transaction as any).findUnique = originalTxFind;
    (prisma.account as any).findUnique = originalAccFind;
  });

  it('calls account.update with correct balance for income on update', async () => {
    const fakeTransaction = {
      id: 7777,
      userId,
      accountId,
      categoryId,
      amount: 100,
      type: 'income',
      date: new Date().toISOString(),
      description: 'mockinc',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const fakeAccount = { id: accountId, balance: 1000 } as any;

    const originalTxUpdate = (prisma.transaction as any).update;
    const originalAccFind = (prisma.account as any).findUnique;
    const originalAccUpdate = (prisma.account as any).update;

    (prisma.transaction as any).update = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(fakeAccount as any);
    (prisma.account as any).update = vi.fn().mockResolvedValueOnce({ ...fakeAccount, balance: 900 } as any);

    const res = await app.request(`/user/${userId}/transactions/7777`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, categoryId, amount: 100, type: 'income', date: new Date().toISOString(), description: 'x' }),
    });

    expect(res.status).toBe(200);
    const accUpdateFn = (prisma.account as any).update as any;
    expect(accUpdateFn).toHaveBeenCalled();
    const calledWith = accUpdateFn.mock.calls[0][0];
    expect(calledWith).toHaveProperty('where');
    expect(calledWith).toHaveProperty('data');
    // balance should be decremented by 100 for income
    expect(calledWith.data).toEqual({ balance: 900 });

    (prisma.transaction as any).update = originalTxUpdate;
    (prisma.account as any).findUnique = originalAccFind;
    (prisma.account as any).update = originalAccUpdate;
  });

  it('creates transaction (income) and calls account.update with increment on create', async () => {
    const fakeTransaction = {
      id: 6666,
      userId,
      accountId,
      categoryId,
      amount: 200,
      type: 'income',
      date: new Date().toISOString(),
      description: 'mockcreateinc',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const originalTxCreate = (prisma.transaction as any).create;
    const originalAccUpdate = (prisma.account as any).update;

    (prisma.transaction as any).create = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).update = vi.fn().mockResolvedValueOnce({ ...fakeTransaction } as any);

    const res = await app.request(`/user/${userId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, categoryId, amount: 200, type: 'income', date: new Date().toISOString(), description: 'x' }),
    });

    expect(res.status).toBe(200);
    const accUpdateFn = (prisma.account as any).update as any;
    expect(accUpdateFn).toHaveBeenCalled();
    const calledWith = accUpdateFn.mock.calls[0][0];
    expect(calledWith.data).toEqual({ balance: { increment: 200 } });

    (prisma.transaction as any).create = originalTxCreate;
    (prisma.account as any).update = originalAccUpdate;
  });

  it('returns 400 when update result has invalid transaction type', async () => {
    const fakeTransaction = {
      id: 5555,
      userId,
      accountId,
      categoryId,
      amount: 10,
      type: 'weird',
      date: new Date().toISOString(),
      description: 'badtype',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const fakeAccount = { id: accountId, balance: 100 } as any;

    const originalTxUpdate = (prisma.transaction as any).update;
    const originalAccFind = (prisma.account as any).findUnique;

    (prisma.transaction as any).update = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(fakeAccount as any);

    const res = await app.request(`/user/${userId}/transactions/5555`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, categoryId, amount: 10, type: 'weird', date: new Date().toISOString(), description: 'x' }),
    });

    expect(res.status).toBe(400);

    (prisma.transaction as any).update = originalTxUpdate;
    (prisma.account as any).findUnique = originalAccFind;
  });

  it('returns 400 when deleting a transaction with invalid transaction type', async () => {
    const fakeTransaction = {
      id: 4444,
      userId,
      accountId,
      categoryId,
      amount: 30,
      type: 'unknown',
      date: new Date().toISOString(),
      description: 'baddelete',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const fakeAccount = { id: accountId, balance: 500 } as any;

    const originalTxFind = (prisma.transaction as any).findUnique;
    const originalAccFind = (prisma.account as any).findUnique;

    (prisma.transaction as any).findUnique = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(fakeAccount as any);

    const res = await app.request(`/user/${userId}/transactions/4444`, { method: 'DELETE' });
    expect(res.status).toBe(400);

    (prisma.transaction as any).findUnique = originalTxFind;
    (prisma.account as any).findUnique = originalAccFind;
  });

  it('calls account.update with correct balance for expense on update', async () => {
    const fakeTransaction = {
      id: 3333,
      userId,
      accountId,
      categoryId,
      amount: 50,
      type: 'expense',
      date: new Date().toISOString(),
      description: 'mockexp',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const fakeAccount = { id: accountId, balance: 1000 } as any;

    const originalTxUpdate = (prisma.transaction as any).update;
    const originalAccFind = (prisma.account as any).findUnique;
    const originalAccUpdate = (prisma.account as any).update;

    (prisma.transaction as any).update = vi.fn().mockResolvedValueOnce(fakeTransaction);
    (prisma.account as any).findUnique = vi.fn().mockResolvedValueOnce(fakeAccount as any);
    (prisma.account as any).update = vi.fn().mockResolvedValueOnce({ ...fakeAccount, balance: 1050 } as any);

    const res = await app.request(`/user/${userId}/transactions/3333`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, categoryId, amount: 50, type: 'expense', date: new Date().toISOString(), description: 'x' }),
    });

    expect(res.status).toBe(200);
    const accUpdateFn = (prisma.account as any).update as any;
    expect(accUpdateFn).toHaveBeenCalled();
    const calledWith = accUpdateFn.mock.calls[0][0];
    expect(calledWith.data).toEqual({ balance: 1050 });

    (prisma.transaction as any).update = originalTxUpdate;
    (prisma.account as any).findUnique = originalAccFind;
    (prisma.account as any).update = originalAccUpdate;
  });
});

afterAll(async () => {
  // Delete the user
  if (userId) {
    await app.request(`/user/${userId}`, { method: 'DELETE' });
  }
  // Delete the category
  if (categoryId) {
    await app.request(`/category/${categoryId}`, { method: 'DELETE' });
  }
  // Delete the account
  if (accountId) {
    await app.request(`/user/${userId}/account/${accountId}`, { method: 'DELETE' });
  }
});

describe('Transaction Routes', () => {
  it('should create a new transaction', async () => {
    const newTransaction = {
      accountId,
      categoryId,
      amount: 100.0,
      type: 'expense',
      date: new Date().toISOString(),
      description: 'Test Transaction',
    };
    //console log the stringified newTransaction
    console.log(JSON.stringify(newTransaction));
    const response = await app.request(`/user/${userId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTransaction),
    });

    const responseBody = await response.json();
    transactionId = responseBody.id;
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.amount).toBe(newTransaction.amount);
    expect(responseBody.type).toBe(newTransaction.type);
  });

  it('should retrieve all transactions for a user', async () => {
    const response = await app.request(`/user/${userId}/transactions`, { method: 'GET' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(responseBody)).toBe(true);
  });

  it('should retrieve a transaction by id', async () => {
    const response = await app.request(`/user/${userId}/transactions/${transactionId}`, { method: 'GET' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', transactionId);
  });

  it('should update a transaction by id', async () => {
    const updatedData = {
      accountId,
      categoryId,
      amount: 150.0,
      type: 'income',
      date: new Date().toISOString(),
      description: 'Updated Transaction',
    };

    const response = await app.request(`/user/${userId}/transactions/${transactionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.amount).toBe(updatedData.amount);
    expect(responseBody.type).toBe(updatedData.type);
  });

  it('should delete a transaction by id', async () => {
    const response = await app.request(`/user/${userId}/transactions/${transactionId}`, { method: 'DELETE' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', transactionId);
  });
});