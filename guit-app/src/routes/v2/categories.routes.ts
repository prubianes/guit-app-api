import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import {
  categoryCreateSchema,
  categoryIdParamSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryIdParam,
  type CategoryUpdateInput,
} from '../../libs/schemas';
import { getAuth, requireAuth } from '../../middleware/auth';
import {
  getValidatedJson,
  getValidatedParams,
  validateJson,
  validateParams,
} from '../../middleware/validate';

const categoryRoutes = new Hono();

categoryRoutes.get('/categories', requireAuth, async (c) => {
  const auth = getAuth(c);
  const categories = await prisma.category.findMany({
    where: { userId: auth.userId },
    orderBy: { id: 'asc' },
  });

  return jsonSuccess(c, categories);
});

categoryRoutes.post('/categories', requireAuth, validateJson(categoryCreateSchema), async (c) => {
  const auth = getAuth(c);
  const body = getValidatedJson<CategoryCreateInput>(c);

  try {
    const category = await prisma.category.create({
      data: {
        userId: auth.userId,
        name: body.name,
        type: body.type,
      },
    });

    return jsonSuccess(c, category, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError({
        status: 409,
        code: 'CATEGORY_ALREADY_EXISTS',
        message: 'Category already exists',
      });
    }

    throw error;
  }
});

categoryRoutes.get('/categories/:categoryId', requireAuth, validateParams(categoryIdParamSchema), async (c) => {
  const auth = getAuth(c);
  const params = getValidatedParams<CategoryIdParam>(c);
  const category = await prisma.category.findFirst({
    where: {
      id: params.categoryId,
      userId: auth.userId,
    },
  });

  if (!category) {
    throw new AppError({
      status: 404,
      code: 'CATEGORY_NOT_FOUND',
      message: 'Category not found',
    });
  }

  return jsonSuccess(c, category);
});

categoryRoutes.put(
  '/categories/:categoryId',
  requireAuth,
  validateParams(categoryIdParamSchema),
  validateJson(categoryUpdateSchema),
  async (c) => {
    const auth = getAuth(c);
    const params = getValidatedParams<CategoryIdParam>(c);
    const body = getValidatedJson<CategoryUpdateInput>(c);

    const existingCategory = await prisma.category.findFirst({
      where: {
        id: params.categoryId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingCategory) {
      throw new AppError({
        status: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    try {
      const category = await prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          name: body.name,
          type: body.type,
        },
      });

      return jsonSuccess(c, category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError({
          status: 409,
          code: 'CATEGORY_ALREADY_EXISTS',
          message: 'Category already exists',
        });
      }

      throw error;
    }
  }
);

categoryRoutes.delete(
  '/categories/:categoryId',
  requireAuth,
  validateParams(categoryIdParamSchema),
  async (c) => {
    const auth = getAuth(c);
  const params = getValidatedParams<CategoryIdParam>(c);

    const existingCategory = await prisma.category.findFirst({
      where: {
        id: params.categoryId,
        userId: auth.userId,
      },
      select: { id: true },
    });

    if (!existingCategory) {
      throw new AppError({
        status: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    const category = await prisma.category.delete({
      where: { id: existingCategory.id },
    });

    return jsonSuccess(c, category);
  }
);

export default categoryRoutes;
