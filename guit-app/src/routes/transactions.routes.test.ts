import app from '../app';
import { describe, expect, it } from 'vitest';

let userId: number = 13; // Replace with a valid user ID
let transactionId: number;
let accountId: number = 26; // Replace with a valid account ID
let categoryId: number = 2; // Replace with a valid category ID

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