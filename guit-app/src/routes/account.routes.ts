import { Hono } from "hono";
import { prisma } from "../libs/prisma";
import { HTTPException } from "hono/http-exception";
import { UNABLE_TO_CREATE_ACCOUNT, USER_NOT_FOUND } from "../libs/errorMessages";
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
    try {
        const accounts = await prisma.user.findMany({
            where: {
                id: userId,
            },
            select: {
                accounts: true
            },
        });
        if(accounts === undefined || accounts.length === 0) {
            return c.json({message: "Not data found"});
        }
        return c.json(accounts);
    } catch (error) {
        throw new HTTPException(404, {message: USER_NOT_FOUND});
    }
});

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
        throw new HTTPException(403, {message: UNABLE_TO_CREATE_ACCOUNT});
    }
});

export default account;