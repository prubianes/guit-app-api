import { Hono } from 'hono';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import {
  budgetCreateSchema,
  budgetIdParamSchema,
  budgetUpdateSchema,
  type BudgetCreateInput,
  type BudgetIdParam,
  type BudgetUpdateInput,
} from '../../libs/schemas';
import { getAuth, requireAuth } from '../../middleware/auth';
import {
  getValidatedJson,
  getValidatedParams,
  validateJson,
  validateParams,
} from '../../middleware/validate';

const meBudgetRoutes = new Hono();

meBudgetRoutes.get('/budgets', requireAuth, async (c) => {
  const auth = getAuth(c);
  const budgets = await prisma.budget.findMany({
    where: { userId: auth.userId },
    orderBy: { id: 'desc' },
  });

  return jsonSuccess(c, budgets);
});

meBudgetRoutes.post('/budgets', requireAuth, validateJson(budgetCreateSchema), async (c) => {
  const auth = getAuth(c);
  const body = getValidatedJson<BudgetCreateInput>(c);

  const budget = await prisma.budget.create({
    data: {
      userId: auth.userId,
      categoryId: body.categoryId,
      amount: body.amount,
      period: body.period,
    },
  });

  return jsonSuccess(c, budget, { status: 201 });
});

meBudgetRoutes.get('/budgets/:budgetId', requireAuth, validateParams(budgetIdParamSchema), async (c) => {
  const auth = getAuth(c);
  const params = getValidatedParams<BudgetIdParam>(c);

  const budget = await prisma.budget.findFirst({
    where: {
      id: params.budgetId,
      userId: auth.userId,
    },
  });

  if (!budget) {
    throw new AppError({
      status: 404,
      code: 'BUDGET_NOT_FOUND',
      message: 'Budget not found',
    });
  }

  return jsonSuccess(c, budget);
});

meBudgetRoutes.patch(
  '/budgets/:budgetId',
  requireAuth,
  validateParams(budgetIdParamSchema),
  validateJson(budgetUpdateSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<BudgetIdParam>(c);
    const body = getValidatedJson<BudgetUpdateInput>(c);

    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: params.budgetId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingBudget) {
      throw new AppError({
        status: 404,
        code: 'BUDGET_NOT_FOUND',
        message: 'Budget not found',
      });
    }

    const budget = await prisma.budget.update({
      where: { id: existingBudget.id },
      data: {
        categoryId: body.categoryId,
        amount: body.amount,
        period: body.period,
      },
    });

    return jsonSuccess(c, budget);
  }
);

meBudgetRoutes.delete('/budgets/:budgetId', requireAuth, validateParams(budgetIdParamSchema), async (c) => {
  const auth = getAuth(c);
  const params = getValidatedParams<BudgetIdParam>(c);

  const existingBudget = await prisma.budget.findFirst({
    where: {
      id: params.budgetId,
      userId: auth.userId,
    },
    select: { id: true },
  });

  if (!existingBudget) {
    throw new AppError({
      status: 404,
      code: 'BUDGET_NOT_FOUND',
      message: 'Budget not found',
    });
  }

  const budget = await prisma.budget.delete({
    where: { id: existingBudget.id },
  });

  return jsonSuccess(c, budget);
});

export default meBudgetRoutes;
