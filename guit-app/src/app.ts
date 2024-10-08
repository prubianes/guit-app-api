import { Hono } from 'hono'
import user from './user/route';
import { HTTPException } from 'hono/http-exception';

const app = new Hono()

app.get('/', (c) => {
    return c.text('Hello Hono!')
});

/**
 * Handles errors thrown by the application.
 * 
 * @param {Error} err - The error object.
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the error details.
 */
app.onError((err, c) => {
    const statusCode = err instanceof HTTPException ? err.status : 500;
    return c.json({
        statusCode,
        message: err.message
    });
});

// Routes
app.route('/user', user)

export default app;