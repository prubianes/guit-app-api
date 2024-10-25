import { Hono } from "hono";
import { prisma } from "../libs/prisma";
import { HTTPException } from "hono/http-exception";
import { BUDGET_ERRORS } from "../libs/errorMessages";
import { Budget } from "@prisma/client";


const budget = new Hono();

/**
 *  Endpoint to get all the budgets for an user.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with all the budgets data.
 * @throws {HTTPException} For all errors.
 * 
 */
budget.get('/:id/budget', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    try {
        const budgets = await prisma.budget.findMany({
            where: {
                userId: userId,
            },
            select: {
                id: true,
                userId: true,
                categoryId: true,
                amount: true,
                period: true,
            },
        });
        if (budgets === undefined || budgets.length === 0) {
            throw new HTTPException(404, { message: BUDGET_ERRORS.NOT_FOUND });
        }
        return c.json(budgets);
    } catch (error) {
        throw new HTTPException(500, { message: BUDGET_ERRORS.RETRIEVAL_ERROR });
    }
});

/**
 *  Endpoint to get a budget by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the budget data. 
 * @throws {HTTPException} For all errors.
 * 
 */
budget.get('/:id/budget/:budgetId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const budgetId = parseInt(c.req.param('budgetId'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_USER_ID });
    }
    if (isNaN(budgetId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_ID });
    }
    try {
        const budget = await prisma.budget.findUnique({
            where: {
                id: budgetId,
            },
        });
        if (!budget) {
            throw new HTTPException(404, { message: BUDGET_ERRORS.NOT_FOUND });
        }
        return c.json(budget);
    } catch (error) {
        throw new HTTPException(500, { message: BUDGET_ERRORS.RETRIEVAL_ERROR });
    }
});

/**
 *  Endpoint to create a new budget.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the created budget data.
 * @throws {HTTPException} For all errors.
 * 
 */
budget.post('/:id/budget', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const requestBody = await c.req.json<Budget>();
    try {
        const budget = await prisma.budget.create({
            data: {
                userId: userId,
                categoryId: requestBody.categoryId,
                amount: requestBody.amount,
                period: requestBody.period,
            },
        });
        return c.json(budget);
    } catch (error) {
        throw new HTTPException(500, { message: BUDGET_ERRORS.CREATE_ERROR });
    }
});

/**
 *  Endpoint to update a budget by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the updated budget data.
 * @throws {HTTPException} For all errors.
 * 
 */
budget.put('/:id/budget/:budgetId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const budgetId = parseInt(c.req.param('budgetId'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_USER_ID });
    }
    if (isNaN(budgetId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_ID });
    }
    const requestBody = await c.req.json<Budget>();
    try {
        const budget = await prisma.budget.update({
            where: {
                id: budgetId,
            },
            data: {
                userId: userId,
                categoryId: requestBody.categoryId,
                amount: requestBody.amount,
                period: requestBody.period,
            },
        });
        if (!budget) {
            throw new HTTPException(404, { message: BUDGET_ERRORS.NOT_FOUND });
        }
        return c.json(budget);
    } catch (error) {
        throw new HTTPException(500, { message: BUDGET_ERRORS.RETRIEVAL_ERROR });
    }
});

/**
 *  Endpoint to delete a budget by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the deleted budget data.
 * @throws {HTTPException} For all errors.
 * 
 */
budget.delete('/:id/budget/:budgetId', async (c) => {
    const userId = parseInt(c.req.param('id'), 10);
    const budgetId = parseInt(c.req.param('budgetId'), 10);
    if (isNaN(userId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_USER_ID });
    }
    if (isNaN(budgetId)) {
        throw new HTTPException(400, { message: BUDGET_ERRORS.INVALID_ID });
    }
    try {
        const budget = await prisma.budget.delete({
            where: {
                id: budgetId,
            },
        });
        if (!budget) {
            throw new HTTPException(404, { message: BUDGET_ERRORS.NOT_FOUND });
        }
        return c.json(budget);
    } catch (error) {
        throw new HTTPException(500, { message: BUDGET_ERRORS.RETRIEVAL_ERROR });
    }
});

export default budget;