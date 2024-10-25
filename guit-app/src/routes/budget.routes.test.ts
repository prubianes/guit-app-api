import app from '../app';
import { describe, expect, it } from 'vitest';

describe('Budget Routes', () => {
  let userId: number = 13;
  let budgetId: number;

  it('should create a new budget', async () => {
    const newBudget = {
      categoryId: 1,
      amount: 200.0,
      period: 'monthly',
    };

    const response = await app.request(`/user/${userId}/budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBudget),
    });

    const responseBody = await response.json();
    budgetId = responseBody.id;
    expect(response.status).toBe(200);
    expect(responseBody.categoryId).toBe(newBudget.categoryId);
    expect(responseBody.amount).toBe(newBudget.amount);
    expect(responseBody.period).toBe(newBudget.period);
  });

  it('should retrieve all budgets for a user', async () => {
    const response = await app.request(`/user/${userId}/budget`);

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve a budget by id', async () => {
    const response = await app.request(`/user/${userId}/budget/${budgetId}`, { method: 'GET' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', budgetId);
  });

  it('should update a budget by id', async () => {
    const updatedBudgetData = {
      categoryId: 2,
      amount: 300.0,
      period: 'yearly',
    };

    const response = await app.request(`/user/${userId}/budget/${budgetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedBudgetData),
    });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.categoryId).toBe(updatedBudgetData.categoryId);
    expect(responseBody.amount).toBe(updatedBudgetData.amount);
    expect(responseBody.period).toBe(updatedBudgetData.period);
  });

  it('should delete a budget by id', async () => {
    const response = await app.request(`/user/${userId}/budget/${budgetId}`, { method: 'DELETE' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', budgetId);
  });
});