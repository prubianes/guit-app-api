import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../libs/prisma';
import { USER_ERRORS } from '../libs/errorMessages';

import { User } from '@prisma/client';

const user = new Hono();

/**
 * Endpoint to create a new user.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the created user data.
 * @throws {HTTPException} If unable to create a new user.
 */
user.post('/', async (c) => {
    const requestBody = await c.req.json<User>();
    try {
        let user_created = await prisma.user.create({
            data: {
                name: requestBody.name,
                email: requestBody.email,
                password: requestBody.password,
            },
        });
        return c.json(user_created);
    } catch (error) {
        throw new HTTPException(403, {message: USER_ERRORS.NOT_FOUND});
    }
})

/**
 * Endpoint to get all the users.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with all the users data.
 */
user.get('/', async (c) => {
    try {
        const users = await prisma.user.findMany();
        return c.json(users);
    } catch (error) {
        throw new HTTPException(500, {message: USER_ERRORS.RETRIEVE_ERROR});
    }
});

/**
 * Endpoint to get a user by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the user data.
 * @throws {HTTPException} If the user is not found.
 */
user.get('/:id', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, {message: USER_ERRORS.INVALID_ID});
    }
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            accounts: true,
            transactions: true,
            budgets: true,
        },
    });
    if (!user) {
        throw new HTTPException(404, {message: USER_ERRORS.NOT_FOUND});
    }
    return c.json(user);
});

/**
 * Endpoint to update a user by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the updated user data.
 * @throws {HTTPException} If the user is not found.
 */
user.put('/:id', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, {message: USER_ERRORS.INVALID_ID});
    }
    const requestBody = await c.req.json<User>();
    const user = await prisma.user.update({
        where: {
            id: userId,
        },
        //TODO - Add validation for the request body and the rest of the fields
        data: {
            name: requestBody.name,
            email: requestBody.email,
            password: requestBody.password,
        },
    });
    if (!user) {
        throw new HTTPException(404, {message: USER_ERRORS.NOT_FOUND});
    }
    return c.json(user);
});

/**
 * Endpoint to delete a user by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the deleted user data.
 * @throws {HTTPException} If the user is not found.
 */
user.delete('/:id', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, {message: USER_ERRORS.INVALID_ID});
    }
    const user = await prisma.user.delete({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new HTTPException(404, {message: USER_ERRORS.NOT_FOUND});
    }
    return c.json(user);
});

export default user;