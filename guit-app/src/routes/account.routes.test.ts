import app from '../app';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

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