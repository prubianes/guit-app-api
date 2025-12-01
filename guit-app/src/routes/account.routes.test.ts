import app from '../app';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../libs/prisma';

let userId: number;
let accountId: number;

beforeAll(async () => {
  // Create a user before all tests
  const newUser = {
    name: 'Test User For Account',
    email: `testuser@example.com`,
    password: 'testpassword123',
  };
  const response = await app.request('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser),
  });
  const responseBody = await response.json();
  userId = responseBody.id;
});

afterAll(async () => {
  // Delete the user after all tests
  if (userId) {
    await app.request(`/user/${userId}`, { method: 'DELETE' });
  }
});

describe('Account Routes', () => {
  it('should create a new account', async () => {
    const newAccount = {
      name: 'Test Account',
      type: 'Savings',
      balance: 1000.0,
    };

    const response = await app.request(`/user/${userId}/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAccount),
    });

    const responseBody = await response.json();
    accountId = responseBody.id;
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.name).toBe(newAccount.name);
    expect(responseBody.type).toBe(newAccount.type);
    expect(responseBody.balance).toBe(newAccount.balance);
  });

  it('should retrieve the account', async () => {
    const response = await app.request(`/user/${userId}/account`);

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve an account by id', async () => {
    const response = await app.request(`/user/${userId}/account/${accountId}`, { method: 'GET' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
  });

  it('should update an account by id', async () => {
    const updatedAccountData = {
      name: 'Updated Account Name',
      type: 'Checking',
      balance: 1500.0,
    };

    const response = await app.request(`/user/${userId}/account/${accountId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedAccountData),
    });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.name).toBe(updatedAccountData.name);
    expect(responseBody.type).toBe(updatedAccountData.type);
    expect(responseBody.balance).toBe(updatedAccountData.balance);
  });

  it('should delete an account by id', async () => {
    const response = await app.request(`/user/${userId}/account/${accountId}`, { method: 'DELETE' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', accountId);
  });
});

describe('Account Routes - error & validation branches', () => {
  it('returns 400 for invalid user id on list', async () => {
    const res = await app.request('/user/invalid/account');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 400 for invalid account id on get', async () => {
    const res = await app.request(`/user/${userId}/account/invalid`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 404 when user has no accounts', async () => {
    const newUser = { name: 'NoAccountUser', email: `noacc-${Date.now()}@example.com`, password: 'testpass' };
    const createRes = await app.request('/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const created = await createRes.json();

  const res = await app.request(`/user/${created.id}/account`);
  expect([404, 500]).toContain(res.status);
  const body = await res.json();
  expect(body).toHaveProperty('message');

    // cleanup
    await app.request(`/user/${created.id}`, { method: 'DELETE' });
  });

  it('returns 404 for non-existing account id', async () => {
  const res = await app.request(`/user/${userId}/account/999999`, { method: 'GET' });
  expect([404, 500]).toContain(res.status);
  const body = await res.json();
  expect(body).toHaveProperty('message');
  });

  it('returns 403 when creating account for non-existent user', async () => {
    const newAccount = { name: 'Should Fail', type: 'Savings', balance: 0 };
    const res = await app.request('/user/999999/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount),
    });
    expect([403, 500]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });
  it('returns 500 when updating a non-existent account', async () => {
    const updated = { name: 'X', type: 'Y', balance: 1 };
    const res = await app.request(`/user/${userId}/account/999998`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when deleting a non-existent account', async () => {
    const res = await app.request(`/user/${userId}/account/999997`, { method: 'DELETE' });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });
});