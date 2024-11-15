import { Hono } from "hono";
import { prisma } from "../libs/prisma";
import { HTTPException } from "hono/http-exception";
import { ACCOUNT_ERRORS } from "../libs/errorMessages";
import { Account } from "@prisma/client";


const account = new Hono();

/**
 * Endpoint to get the account.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the account data.
 */
account.get('/:id/account', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: ACCOUNT_ERRORS.INVALID_ID });
    }
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                accounts: true
            },
        });
        if (!user || !user.accounts || user.accounts.length === 0) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }
        return c.json(user.accounts);
    } catch (error) {
        throw new HTTPException(500, { message: ACCOUNT_ERRORS.RETRIEVE_ERROR });
    }
});

/**
 * Endpoint to create a new account.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response. 
 * @returns {Promise<Response>} JSON response with the created account data.
 * @throws {HTTPException} If unable to create a new account.
 */
account.post('/:id/account', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const requestBody = await c.req.json<Account>();
    try {
        const accounts = await prisma.account.create({
            data: {
                userId: userId,
                name: requestBody.name,
                type: requestBody.type,
                balance: requestBody.balance,
            },
        });
        return c.json(accounts);
    } catch (error) {
        throw new HTTPException(403, { message: ACCOUNT_ERRORS.CREATE_ERROR });
    }
});

/**
 * Endpoint to get a account by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the account data.
 * @throws {HTTPException} If the account is not found.
 */
account.get('/:id/account/:accountId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const accountId = parseInt(c.req.param('accountId'), 10);
    validateIds(userId, accountId);
    try {
        const accounts = await prisma.account.findMany({
            where: {
                userId: userId,
                id: accountId,
            },
            select: {
                name: true,
                type: true,
                balance: true,
            },
        });
        if (accounts === undefined || accounts.length === 0) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }
        return c.json(accounts);
    } catch (error) {
        throw new HTTPException(500, { message: ACCOUNT_ERRORS.RETRIEVE_ERROR });
    }
});

/**
 * Endpoint to update a account by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the updated account data.
 * @throws {HTTPException} If the account is not found.
 */
account.put('/:id/account/:accountId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const accountId = parseInt(c.req.param('accountId'), 10);
    validateIds(userId, accountId);
    const requestBody = await c.req.json<Account>();
    try {
        const accounts = await prisma.account.update({
            where: {
                userId: userId,
                id: accountId,
            },
            data: {
                name: requestBody.name,
                type: requestBody.type,
                balance: requestBody.balance,
            },
        });
        if (accounts === undefined) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }
        return c.json(accounts);
    } catch (error) {
        throw new HTTPException(500, { message: ACCOUNT_ERRORS.RETRIEVE_ERROR });
    }
});

/**
 * Endpoint to delete a account by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the deleted account data.
 * @throws {HTTPException} If the account is not found.
 */
account.delete('/:id/account/:accountId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const accountId = parseInt(c.req.param('accountId'), 10);
    validateIds(userId, accountId);
    try {
        const accounts = await prisma.account.delete({
            where: {
                userId: userId,
                id: accountId,
            },
        });
        if (accounts === undefined) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }
        return c.json(accounts);
    } catch (error) {
        throw new HTTPException(500, { message: ACCOUNT_ERRORS.DELETE_ERROR });
    }
});

function validateIds(userId: number, accountId: number) {
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: ACCOUNT_ERRORS.INVALID_ID });
    }
    if (isNaN(accountId)) {
        throw new HTTPException(400, { message: ACCOUNT_ERRORS.INVALID_ID });
    }
}

export default account;