import { Hono } from 'hono';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import {
  transactionCreateSchema,
  transactionIdParamSchema,
  transactionUpdateSchema,
  type TransactionCreateInput,
  type TransactionIdParam,
  type TransactionUpdateInput,
} from '../../libs/schemas';
import { getAuth, requireAuth } from '../../middleware/auth';
import {
  getValidatedJson,
  getValidatedParams,
  validateJson,
  validateParams,
} from '../../middleware/validate';

const meTransactionRoutes = new Hono();

meTransactionRoutes.get('/transactions', requireAuth, async (c) => {
  const auth = getAuth(c);
  const transactions = await prisma.transaction.findMany({
    where: { userId: auth.userId },
    orderBy: { date: 'desc' },
  });

  return jsonSuccess(c, transactions);
});

meTransactionRoutes.post('/transactions', requireAuth, validateJson(transactionCreateSchema), async (c) => {
  const auth = getAuth(c);
  const body = getValidatedJson<TransactionCreateInput>(c);

  const account = await prisma.account.findFirst({
    where: {
      id: body.accountId,
      userId: auth.userId,
    },
    select: { id: true },
  });

  if (!account) {
    throw new AppError({
      status: 404,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found',
    });
  }

  const category = await prisma.category.findUnique({
    where: { id: body.categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError({
      status: 404,
      code: 'CATEGORY_NOT_FOUND',
      message: 'Category not found',
    });
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        userId: auth.userId,
        accountId: body.accountId,
        categoryId: body.categoryId,
        amount: body.amount,
        type: body.type,
        date: new Date(body.date),
        description: body.description,
      },
    });

    await tx.account.update({
      where: { id: body.accountId },
      data: {
        balance: toBalanceMutation(transactionBalanceDelta(body.type, body.amount)),
      },
    });

    return created;
  });

  return jsonSuccess(c, transaction, { status: 201 });
});

meTransactionRoutes.get(
  '/transactions/:transactionId',
  requireAuth,
  validateParams(transactionIdParamSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<TransactionIdParam>(c);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.transactionId,
        userId: auth.userId,
      },
    });

    if (!transaction) {
      throw new AppError({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return jsonSuccess(c, transaction);
  }
);

meTransactionRoutes.patch(
  '/transactions/:transactionId',
  requireAuth,
  validateParams(transactionIdParamSchema),
  validateJson(transactionUpdateSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<TransactionIdParam>(c);
    const body = getValidatedJson<TransactionUpdateInput>(c);

    const existing = await prisma.transaction.findFirst({
      where: {
        id: params.transactionId,
        userId: auth.userId,
      },
    });

    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    const nextAccountId = body.accountId ?? existing.accountId;
    const nextCategoryId = body.categoryId ?? existing.categoryId;
    const nextAmount = body.amount ?? existing.amount;
    const nextType = body.type ?? (existing.type as 'expense' | 'income');
    const nextDate = body.date ? new Date(body.date) : existing.date;
    const nextDescription = body.description ?? existing.description ?? undefined;

    const account = await prisma.account.findFirst({
      where: {
        id: nextAccountId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!account) {
      throw new AppError({
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: nextCategoryId },
      select: { id: true },
    });

    if (!category) {
      throw new AppError({
        status: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: toBalanceMutation(
            -transactionBalanceDelta(existing.type as 'expense' | 'income', existing.amount)
          ),
        },
      });

      await tx.account.update({
        where: { id: nextAccountId },
        data: {
          balance: toBalanceMutation(transactionBalanceDelta(nextType, nextAmount)),
        },
      });

      return tx.transaction.update({
        where: { id: existing.id },
        data: {
          accountId: nextAccountId,
          categoryId: nextCategoryId,
          amount: nextAmount,
          type: nextType,
          date: nextDate,
          description: nextDescription,
        },
      });
    });

    return jsonSuccess(c, transaction);
  }
);

meTransactionRoutes.delete(
  '/transactions/:transactionId',
  requireAuth,
  validateParams(transactionIdParamSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<TransactionIdParam>(c);

    const existing = await prisma.transaction.findFirst({
      where: {
        id: params.transactionId,
        userId: auth.userId,
      },
    });

    if (!existing) {
      throw new AppError({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: toBalanceMutation(
            -transactionBalanceDelta(existing.type as 'expense' | 'income', existing.amount)
          ),
        },
      });

      return tx.transaction.delete({
        where: { id: existing.id },
      });
    });

    return jsonSuccess(c, transaction);
  }
);

function transactionBalanceDelta(type: 'expense' | 'income', amount: number) {
  return type === 'income' ? amount : -amount;
}

function toBalanceMutation(delta: number) {
  if (delta >= 0) {
    return { increment: delta };
  }

  return { decrement: Math.abs(delta) };
}

export default meTransactionRoutes;
