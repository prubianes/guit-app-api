import { Hono } from 'hono'
import user from './routes/users.routes';
import { HTTPException } from 'hono/http-exception';
import account from './routes/account.routes';

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

/**
 * Handles requests to non-existent routes.
 * 
 * @param {Context} c - The context object containing the request and response. 
 * @returns {Promise<Response>} JSON response with the error details.
 */
app.notFound((c) => {
    return c.json({
        statusCode: 404,
        message: 'Not found'
    });
});

// Routes
app.route('/user', user);
app.route('/user', account);
export default app;