import app from '../app';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

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