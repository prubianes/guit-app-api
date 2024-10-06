import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../libs/prisma';
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
    let user_created = null;
    try {
        user_created = await prisma.user.create({
            data: {
                name: requestBody.name,
                email: requestBody.email,
                password: requestBody.password,
            },
        });
    } catch (error) {
        throw new HTTPException(403, {message: "Unable to create a new user"});
    }
    return c.json(user_created);
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
    const users = await prisma.user.findMany();
    return c.json(users);
})

export default user;