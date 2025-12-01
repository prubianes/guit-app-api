import { Hono } from "hono";
import { prisma } from "../libs/prisma";
import { HTTPException } from "hono/http-exception";
import { CATEGORY_ERRORS } from "../libs/errorMessages";
import { Category } from "@prisma/client";

const categories = new Hono();

/**
 *  Endpoint to get all the categories.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with all the categories data.
 */
categories.get('/', async (c) => {
    try {
        const categories = await prisma.category.findMany();
        return c.json(categories);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {message: CATEGORY_ERRORS.RETRIEVE_ALL_ERROR});
    }
});

/**
 *  Endpoint to get a category by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the category data.
 * @throws {HTTPException} If the category is not found.
 */
categories.get('/:id', async (c) => {
    const categoryId = parseInt(c.req.param('id'), 10);
    if (isNaN(categoryId)) {
        throw new HTTPException(400, {message: CATEGORY_ERRORS.INVALID_ID});
    }
    try {
        const category = await prisma.category.findUnique({
            where: {
                id: categoryId,
            },
        });
        if (!category) {
            throw new HTTPException(404, {message: CATEGORY_ERRORS.NOT_FOUND});
        }
        return c.json(category);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {message: CATEGORY_ERRORS.RETRIEVE_ERROR});
    }
});

/**
 *  Endpoint to delete a category by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the deleted category data.
 * @throws {HTTPException} If the category is not found.   
 */
categories.delete('/:id', async (c) => {
    const categoryId = parseInt(c.req.param('id'), 10);
    if (isNaN(categoryId)) {
        throw new HTTPException(400, {message: CATEGORY_ERRORS.INVALID_ID});
    }
    try {
        const category = await prisma.category.delete({
            where: {
                id: categoryId,
            },
        });
        if (!category) {
            throw new HTTPException(404, {message: CATEGORY_ERRORS.NOT_FOUND});
        }
        return c.json(category);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {message: CATEGORY_ERRORS.DELETE_ERROR});
    }
});

/**
 *  Endpoint to create a new category.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the created category data.
 * @throws {HTTPException} If unable to create a new category.  
 */
categories.post('/', async (c) => {
    const requestBody = await c.req.json<Category>();
    try {
        const category = await prisma.category.create({
            data: {
                name: requestBody.name,
                type: requestBody.type,
            },
        });
        return c.json(category);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {message: CATEGORY_ERRORS.CREATE_ERROR});
    }
});

/**
 *  Endpoint to update a category by id.
 * 
 * @async
 * @function
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the updated category data.   
 * @throws {HTTPException} If the category is not found.
 */
categories.put('/:id', async (c) => {
    const categoryId = parseInt(c.req.param('id'), 10);
    if (isNaN(categoryId)) {
        throw new HTTPException(400, {message: CATEGORY_ERRORS.INVALID_ID});
    }
    const requestBody = await c.req.json<Category>();
    try {
        const category = await prisma.category.update({
            where: {
                id: categoryId,
            },
            data: {
                name: requestBody.name,
                type: requestBody.type,
            },
        });
        if (!category) {
            throw new HTTPException(404, {message: CATEGORY_ERRORS.NOT_FOUND});
        }
        return c.json(category);
    } catch (error: any) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {message: CATEGORY_ERRORS.RETRIEVE_ERROR});
    }
}); 


export default categories;