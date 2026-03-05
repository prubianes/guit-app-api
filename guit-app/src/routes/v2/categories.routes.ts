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
import {
  getValidatedJson,
  getValidatedParams,
  validateJson,
  validateParams,
} from '../../middleware/validate';

const categoryRoutes = new Hono();

categoryRoutes.get('/categories', async (c) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
  });

  return jsonSuccess(c, categories);
});

categoryRoutes.post('/categories', validateJson(categoryCreateSchema), async (c) => {
  const body = getValidatedJson<CategoryCreateInput>(c);
  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
    },
  });

  return jsonSuccess(c, category, { status: 201 });
});

categoryRoutes.get('/categories/:categoryId', validateParams(categoryIdParamSchema), async (c) => {
  const params = getValidatedParams<CategoryIdParam>(c);
  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
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
  validateParams(categoryIdParamSchema),
  validateJson(categoryUpdateSchema),
  async (c) => {
    const params = getValidatedParams<CategoryIdParam>(c);
    const body = getValidatedJson<CategoryUpdateInput>(c);

    try {
      const category = await prisma.category.update({
        where: { id: params.categoryId },
        data: {
          name: body.name,
          type: body.type,
        },
      });

      return jsonSuccess(c, category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError({
          status: 404,
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        });
      }

      throw error;
    }
  }
);

categoryRoutes.delete('/categories/:categoryId', validateParams(categoryIdParamSchema), async (c) => {
  const params = getValidatedParams<CategoryIdParam>(c);

  try {
    const category = await prisma.category.delete({
      where: { id: params.categoryId },
    });

    return jsonSuccess(c, category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError({
        status: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    throw error;
  }
});

export default categoryRoutes;
