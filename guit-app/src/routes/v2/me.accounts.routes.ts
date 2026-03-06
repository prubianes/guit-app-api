import { Hono } from 'hono';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import {
  accountCreateSchema,
  accountIdParamSchema,
  accountUpdateSchema,
  type AccountCreateInput,
  type AccountIdParam,
  type AccountUpdateInput,
} from '../../libs/schemas';
import { getAuth, requireAuth } from '../../middleware/auth';
import {
  getValidatedJson,
  getValidatedParams,
  validateJson,
  validateParams,
} from '../../middleware/validate';

const meAccountRoutes = new Hono();

meAccountRoutes.get('/accounts', requireAuth, async (c) => {
  const auth = getAuth(c);
  const accounts = await prisma.account.findMany({
    where: { userId: auth.userId },
    orderBy: { id: 'desc' },
  });

  return jsonSuccess(c, accounts);
});

meAccountRoutes.post('/accounts', requireAuth, validateJson(accountCreateSchema), async (c) => {
  const auth = getAuth(c);
  const body = getValidatedJson<AccountCreateInput>(c);

  const account = await prisma.account.create({
    data: {
      userId: auth.userId,
      name: body.name,
      type: body.type,
      balance: body.balance,
    },
  });

  return jsonSuccess(c, account, { status: 201 });
});

meAccountRoutes.get('/accounts/:accountId', requireAuth, validateParams(accountIdParamSchema), async (c) => {
  const auth = getAuth(c);
  const params = getValidatedParams<AccountIdParam>(c);

  const account = await prisma.account.findFirst({
    where: {
      id: params.accountId,
      userId: auth.userId,
    },
  });

  if (!account) {
    throw new AppError({
      status: 404,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found',
    });
  }

  return jsonSuccess(c, account);
});

meAccountRoutes.patch(
  '/accounts/:accountId',
  requireAuth,
  validateParams(accountIdParamSchema),
  validateJson(accountUpdateSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<AccountIdParam>(c);
    const body = getValidatedJson<AccountUpdateInput>(c);

    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.accountId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingAccount) {
      throw new AppError({
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }

    const account = await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        name: body.name,
        type: body.type,
        balance: body.balance,
      },
    });

    return jsonSuccess(c, account);
  }
);

meAccountRoutes.delete(
  '/accounts/:accountId',
  requireAuth,
  validateParams(accountIdParamSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<AccountIdParam>(c);

    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.accountId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingAccount) {
      throw new AppError({
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }

    const account = await prisma.account.delete({
      where: { id: existingAccount.id },
    });

    return jsonSuccess(c, account);
  }
);

export default meAccountRoutes;
