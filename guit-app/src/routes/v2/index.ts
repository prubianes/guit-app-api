import { Hono } from 'hono';
import authRoutes from './auth.routes';
import meProfileRoutes from './me.profile.routes';
import meAccountRoutes from './me.accounts.routes';
import meBudgetRoutes from './me.budgets.routes';
import meTransactionRoutes from './me.transactions.routes';

const v2 = new Hono();

v2.route('/auth', authRoutes);
v2.route('/me', meProfileRoutes);
v2.route('/me', meAccountRoutes);
v2.route('/me', meBudgetRoutes);
v2.route('/me', meTransactionRoutes);

export default v2;
