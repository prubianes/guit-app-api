import app from '../app';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

let userId: number;
let budgetId: number;
let categoryId: number;

beforeAll(async () => {
  // Create a user before all tests
  const newUser = {
    name: 'Test User For Budget',
    email: `testuser-budget+${Date.now()}@example.com`,
    password: 'testpassword123',
  };
  const userResponse = await app.request('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser),
  });
  const userBody = await userResponse.json();
  userId = userBody.id;

  // Create a category before all tests
  const newCategory = {
    name: 'Test Category For Budget',
    type: 'expense',
  };
  const categoryResponse = await app.request('/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCategory),
  });
  const categoryBody = await categoryResponse.json();
  categoryId = categoryBody.id;
});

afterAll(async () => {
  // Delete the user after all tests
  if (userId) {
    await app.request(`/user/${userId}`, { method: 'DELETE' });
  }
  // Delete the category after all tests
  if (categoryId) {
    await app.request(`/category/${categoryId}`, { method: 'DELETE' });
  }
});

describe('Budget Routes', () => {
  it('should create a new budget', async () => {
    const newBudget = {
      categoryId,
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
      categoryId,
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

describe('Budget Routes - error & validation branches', () => {
  it('returns 400 for invalid user id on list', async () => {
    const res = await app.request('/user/invalid/budget');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 400 for invalid budget id on get', async () => {
    const res = await app.request(`/user/${userId}/budget/invalid`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 404 when user has no budgets', async () => {
    const newUser = { name: 'NoBudgetUser', email: `nobudget-${Date.now()}@example.com`, password: 'testpass' };
    const createRes = await app.request('/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const created = await createRes.json();

    const res = await app.request(`/user/${created.id}/budget`);
    expect([404, 500]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('message');

    // cleanup
    await app.request(`/user/${created.id}`, { method: 'DELETE' });
  });

  it('returns 404 for non-existing budget id', async () => {
    const res = await app.request(`/user/${userId}/budget/999999`, { method: 'GET' });
    expect([404, 500]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when creating budget for non-existent user', async () => {
    const newBudget = { categoryId, amount: 10, period: 'monthly' };
    const res = await app.request('/user/999999/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBudget),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when updating a non-existent budget', async () => {
    const updated = { categoryId, amount: 1, period: 'yearly' };
    const res = await app.request(`/user/${userId}/budget/999998`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 500 when deleting a non-existent budget', async () => {
    const res = await app.request(`/user/${userId}/budget/999997`, { method: 'DELETE' });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });
});