import app from '../app';
import { describe, expect, it } from 'vitest';

describe('Account Routes', () => {
  let userId: number = 13;
  let accountId: number;

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