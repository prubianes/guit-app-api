import app from '../app';
import { describe, expect, it } from 'vitest';

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