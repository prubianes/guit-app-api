import { Hono } from "hono"; 

import { prisma } from "../libs/prisma";
import { HTTPException } from "hono/http-exception";
import { Transaction } from "@prisma/client";
import { ACCOUNT_ERRORS, TRANSACTION_ERRORS } from "../libs/errorMessages";

const transaction = new Hono();

const TRANSACTION_TYPES = {
    EXPENSE: 'expense',
    INCOME: 'income'
};

/**
 *  Endpoint to get all the transactions for an user.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with all the transactions data.
 */
transaction.get('/:id/transactions', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
            },
            select: {
                id: true,
                userId: true,
                accountId: true,
                categoryId: true,
                amount: true,
                type: true,
                date: true,
                description: true,
            },
        });
        if (transactions === undefined || transactions.length === 0) {
            throw new HTTPException(404, { message: TRANSACTION_ERRORS.NOT_FOUND });
        }
        return c.json(transactions);
    } catch (error) {
        throw new HTTPException(500, { message: TRANSACTION_ERRORS.RETRIEVAL_ERROR });
    }
});

// Endpoint to get a transaction by id.
transaction.get('/:id/transactions/:transactionId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const transactionId = parseInt(c.req.param('transactionId'), 10);

    if (isNaN(userId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_USER_ID });
    }

    if (isNaN(transactionId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_ID });
    }

    try {
        const transaction = await prisma.transaction.findUnique({
            where: {
                id: transactionId,
            },
        });

        if (!transaction) {
            throw new HTTPException(404, { message: TRANSACTION_ERRORS.NOT_FOUND });
        }

        return c.json(transaction);
    } catch (error) {
        throw new HTTPException(500, { message: TRANSACTION_ERRORS.RETRIEVAL_ERROR });
    }
});

/**
 *  Endpoint to post a new transaction for an user.
 *  with the transaction type being "expense" or "income", it will
 *  add or sustract the amount from the account balance.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the created transaction data.
 * @throws {HTTPException} If unable to create a new transaction.
 */
transaction.post('/:id/transactions', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: 'Invalid user ID' });
    }

    let requestBody;
    try {
        requestBody = await c.req.json<Transaction>();
    } catch {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_REQUEST_BODY });
    }

    const { accountId, categoryId, amount, type, date, description } = requestBody;

    if (!accountId || !categoryId || isNaN(amount) || ![TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME].includes(type)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_TRANSACTION_DATA });
    }
    
    try {
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                accountId,
                categoryId,
                amount,
                type,
                date,
                description,
            },
        });

        const balanceUpdate = type === TRANSACTION_TYPES.EXPENSE ? { decrement: amount } : { increment: amount };

        await prisma.account.update({
            where: { id: accountId },
            data: { balance: balanceUpdate },
        });

        return c.json(transaction);
    } catch (error) {
        console.error(error);
        throw new HTTPException(500, { message: TRANSACTION_ERRORS.CREATION_ERROR });
    }
});

/**
 * Endpoint to update the transaction by id, updating the account balance.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the updated transaction data.
 * @throws {HTTPException} If the transaction is not found.
 */
transaction.put('/:id/transactions/:transactionId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const transactionId = parseInt(c.req.param('transactionId'), 10);

    if (isNaN(userId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_USER_ID });
    }

    if (isNaN(transactionId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_ID });
    }

    let requestBody;
    try {
        requestBody = await c.req.json<Transaction>();
    } catch {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_REQUEST_BODY });
    }

    const { accountId, categoryId, amount, type, date, description } = requestBody;

    if (!accountId || !categoryId || isNaN(amount) || ![TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME].includes(type)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_TRANSACTION_DATA });
    }

    try {
        const transaction = await prisma.transaction.update({
            where: {
                id: transactionId,
            },
            data: {
                userId,
                accountId,
                categoryId,
                amount,
                type,
                date,
                description,
            },
        });

        const account = await prisma.account.findUnique({
            where: { id: transaction.accountId },
        });

        if (!account) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }

        let balanceUpdate;
        if (transaction.type === TRANSACTION_TYPES.INCOME) {
            balanceUpdate = account.balance - transaction.amount;
        } else if (transaction.type === TRANSACTION_TYPES.EXPENSE) {
            balanceUpdate = account.balance + transaction.amount;
        } else {
            throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_TRANSACTION_DATA });
        }

        await prisma.account.update({
            where: { id: transaction.accountId },
            data: { balance: balanceUpdate },
        });

        return c.json(transaction);
    } catch (error) {
        throw new HTTPException(500, { message: TRANSACTION_ERRORS.RETRIEVAL_ERROR });
    }
});

/**
 *  Endpoint to delete a transaction by id, updating the account balance.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the deleted transaction data.
 * @throws {HTTPException} If the transaction is not found.
 */
transaction.delete('/:id/transactions/:transactionId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const transactionId = parseInt(c.req.param('transactionId'), 10);

    if (isNaN(userId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_USER_ID });
    }

    if (isNaN(transactionId)) {
        throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_ID });
    }

    try {
        const transaction = await prisma.transaction.findUnique({
            where: {
                id: transactionId,
            },
        });

        if (!transaction) {
            throw new HTTPException(404, { message: TRANSACTION_ERRORS.NOT_FOUND });
        }

        const account = await prisma.account.findUnique({
            where: { id: transaction.accountId },
        });

        if (!account) {
            throw new HTTPException(404, { message: ACCOUNT_ERRORS.NOT_FOUND });
        }

        let balanceUpdate;
        if (transaction.type === TRANSACTION_TYPES.INCOME) {
            balanceUpdate = account.balance - transaction.amount;
        } else if (transaction.type === TRANSACTION_TYPES.EXPENSE) {
            balanceUpdate = account.balance + transaction.amount;
        } else {
            throw new HTTPException(400, { message: TRANSACTION_ERRORS.INVALID_TRANSACTION_DATA });
        }

        await prisma.account.update({
            where: { id: transaction.accountId },
            data: { balance: balanceUpdate },
        });

        const deletedTransaction = await prisma.transaction.delete({
            where: {
                id: transactionId,
            },
        });

        return c.json(deletedTransaction);
    } catch (error) {
        throw new HTTPException(500, { message: TRANSACTION_ERRORS.RETRIEVAL_ERROR });
    }
});

export default transaction;