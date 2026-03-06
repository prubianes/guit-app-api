import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { serveStatic } from '@hono/node-server/serve-static';
import v2 from './routes/v2.routes';
import { AppError, renderError } from './libs/errors';
import { jsonSuccess } from './libs/http';

const app = new Hono()

// Serve openapi.json statically at /openapi.json
app.use('/openapi.json', serveStatic({ path: './static/openapi.json' }));

// Serve Swagger UI at /docs
app.get('/docs', swaggerUI({
  url: '/openapi.json',
}));

app.get('/', (c) => {
    return jsonSuccess(c, { message: 'Hello Hono!' })
});

/**
 * Handles errors thrown by the application.
 * 
 * @param {Error} err - The error object.
 * @param {Context} c - The context object containing the request and response.
 * @returns {Promise<Response>} JSON response with the error details.
 */
app.onError((err, c) => {
    return renderError(c, err);
});

/**
 * Handles requests to non-existent routes.
 * 
 * @param {Context} c - The context object containing the request and response. 
 * @returns {Promise<Response>} JSON response with the error details.
 */
app.notFound((c) => {
    return renderError(c, new AppError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Not found',
    }));
});

// Routes
app.route('/api/v2', v2);

export default app;
