import app from '../app';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../libs/prisma';

let categoryId: number;

describe('Category Routes', () => {

    it('should create a new category', async () => {
        const newCategory = {
            name: 'Test Category',
            type: 'Test Type',
        };

        const response = await app.request('/category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newCategory),
        });
        const responseBody = await response.json();
        categoryId = responseBody.id;
        expect(response.status).toBe(200);
        expect(responseBody).toHaveProperty('id');
        expect(responseBody.name).toBe(newCategory.name);
        expect(responseBody.type).toBe(newCategory.type);
    });

    it('should retrieve all categories', async () => {
        const response = await app.request('/category', { method: 'GET' });
        expect(response.status).toBe(200);
        const responseBody = await response.json();
        expect(Array.isArray(responseBody)).toBe(true);
    });

    it('should retrieve a category by id', async () => {
        const response = await app.request(`/category/${categoryId}`, { method: 'GET' });

        const responseBody = await response.json();
        expect(response.status).toBe(200);
        expect(responseBody).toHaveProperty('id', categoryId);
    });

    it('should update a category by id', async () => {
        const updatedData = {
            name: 'Updated Category',
            type: 'Updated Type',
        };

        const response = await app.request(`/category/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });
        expect(response.status).toBe(200);
        const responseBody = await response.json();
        expect(responseBody.name).toBe(updatedData.name);
        expect(responseBody.type).toBe(updatedData.type);
    });

    it('should delete a category by id', async () => {
        const response = await app.request(`/category/${categoryId}`, { method: 'DELETE' });

        const responseBody = await response.json();
        expect(response.status).toBe(200);
        expect(responseBody).toHaveProperty('id', categoryId);
    });
});

describe('Category Routes - error & validation branches', () => {
    it('returns 400 for invalid id on get', async () => {
        const res = await app.request('/category/invalid');
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty('message');
    });

    it('returns 404 when category not found', async () => {
        const res = await app.request('/category/999999');
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toHaveProperty('message');
    });

    it('returns 400 for invalid id on delete', async () => {
        const res = await app.request('/category/invalid', { method: 'DELETE' });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty('message');
    });

    it('returns 500 when findMany throws', async () => {
        const originalFindMany = (prisma.category as any).findMany;
        (prisma.category as any).findMany = vi.fn().mockRejectedValueOnce(new Error('boom'));

        const res = await app.request('/category');
        expect(res.status).toBe(500);

        (prisma.category as any).findMany = originalFindMany;
    });

    it('returns 500 when create fails', async () => {
        const originalCreate = (prisma.category as any).create;
        (prisma.category as any).create = vi.fn().mockRejectedValueOnce(new Error('create-fail'));

        const res = await app.request('/category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'X', type: 'Y' }),
        });

        expect(res.status).toBe(500);

        (prisma.category as any).create = originalCreate;
    });

    it('returns 500 when update fails', async () => {
        const originalUpdate = (prisma.category as any).update;
        (prisma.category as any).update = vi.fn().mockRejectedValueOnce(new Error('update-fail'));

        const res = await app.request('/category/12345', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'X', type: 'Y' }),
        });

        expect(res.status).toBe(500);

        (prisma.category as any).update = originalUpdate;
    });

    it('returns 500 when delete fails', async () => {
        const originalDelete = (prisma.category as any).delete;
        (prisma.category as any).delete = vi.fn().mockRejectedValueOnce(new Error('delete-fail'));

        const res = await app.request('/category/12345', { method: 'DELETE' });
        expect(res.status).toBe(500);

        (prisma.category as any).delete = originalDelete;
    });
});