import { Hono } from 'hono';
import { AppError } from '../libs/errors';
import { requireAuth } from '../middleware/auth';

const v2 = new Hono();

const notImplemented = () => {
  throw new AppError({
    status: 501,
    code: 'NOT_IMPLEMENTED',
    message: 'Endpoint scaffolded but not implemented yet',
  });
};

v2.post('/auth/register', () => notImplemented());
v2.post('/auth/login', () => notImplemented());
v2.post('/auth/refresh', () => notImplemented());

v2.get('/me', requireAuth, () => notImplemented());

export default v2;
