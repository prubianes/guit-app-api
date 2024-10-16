
import app from '../app';
import { describe, expect, it } from 'vitest';

let userId: number;


describe('User Routes', () => {

  it('should create a new user', async () => {
    const newUser = {
      name: 'Test User',
      email: 'unit@example.com',
      password: 'securepassword123',
    };

    const response = await app.request('/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    })
    const responseBody = await response.json();
    userId = responseBody.id;
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.name).toBe(newUser.name);
    expect(responseBody.email).toBe(newUser.email);
  });

  it('should retrieve all users', async () => {
    const response = await app.request('/user', { method: 'GET' });
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(Array.isArray(responseBody)).toBe(true);
  });

  it('should retrieve a user by id', async () => {
    const response = await app.request(`/user/${userId}`, { method: 'GET' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('email');
  });

  it('should update a user by id', async () => {
    const updatedData = {
      name: 'Updated Name',
      email: 'updated@example.com',
      password: 'newsecurepassword123',
    };

    const response = await app.request(`/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }, body: JSON.stringify(updatedData)
    });
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.name).toBe(updatedData.name);
    expect(responseBody.email).toBe(updatedData.email);
  });

  it('should delete a user by id', async () => {
    const response = await app.request(`/user/${userId}`, { method: 'DELETE' });

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toHaveProperty('id', userId);
  });
});