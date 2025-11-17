
import app from '../app';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../libs/prisma';

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
    // Ensure password is not returned
    expect(responseBody).not.toHaveProperty('password');
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

describe('User Routes - error & validation branches', () => {
  it('returns 403 when create fails', async () => {
    const originalCreate = (prisma.user as any).create;
    (prisma.user as any).create = vi.fn().mockRejectedValueOnce(new Error('create-fail'));

    const res = await app.request('/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', email: 'x@example.com', password: 'p' }),
    });

    expect(res.status).toBe(403);

    (prisma.user as any).create = originalCreate;
  });

  it('returns 500 when findMany throws', async () => {
    const originalFindMany = (prisma.user as any).findMany;
    (prisma.user as any).findMany = vi.fn().mockRejectedValueOnce(new Error('boom'));

    const res = await app.request('/user');
    expect(res.status).toBe(500);

    (prisma.user as any).findMany = originalFindMany;
  });

  it('returns 400 for invalid id on get', async () => {
    const res = await app.request('/user/invalid');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  it('returns 404 when user not found (get)', async () => {
    const originalFindUnique = (prisma.user as any).findUnique;
    (prisma.user as any).findUnique = vi.fn().mockResolvedValueOnce(null as any);

    const res = await app.request('/user/999999');
    expect(res.status).toBe(404);

    (prisma.user as any).findUnique = originalFindUnique;
  });

  it('returns 400 for invalid id on put', async () => {
    const res = await app.request('/user/invalid', { method: 'PUT' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when update returns null', async () => {
    const originalUpdate = (prisma.user as any).update;
    (prisma.user as any).update = vi.fn().mockResolvedValueOnce(null as any);

    const res = await app.request('/user/5555', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', email: 'x@x.com', password: 'p' }),
    });
    expect(res.status).toBe(404);

    (prisma.user as any).update = originalUpdate;
  });

  it('returns 400 for invalid id on delete', async () => {
    const res = await app.request('/user/invalid', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when delete returns null', async () => {
    const originalDelete = (prisma.user as any).delete;
    (prisma.user as any).delete = vi.fn().mockResolvedValueOnce(null as any);

    const res = await app.request('/user/5556', { method: 'DELETE' });
    expect(res.status).toBe(404);

    (prisma.user as any).delete = originalDelete;
  });
});