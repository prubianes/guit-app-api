import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static';
import user from './routes/users.routes';
import { HTTPException } from 'hono/http-exception';
import account from './routes/account.routes';
import categories from './routes/categories.routes';
import transaction from './routes/transactions.routes';
import budget from './routes/budget.routes';

const app = new Hono()

// Serve openapi.json statically at /openapi.json
app.use('/openapi.json', serveStatic({ path: './static/openapi.json' }));

// Serve Swagger UI at /docs
app.get('/docs', swaggerUI({
  url: '/openapi.json',
}));

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
app.route('/category', categories);
app.route('/user', transaction);
app.route('/user', budget);

export default app;