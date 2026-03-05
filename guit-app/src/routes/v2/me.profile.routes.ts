import { Hono } from 'hono';
import { AppError } from '../../libs/errors';
import { jsonSuccess } from '../../libs/http';
import { prisma } from '../../libs/prisma';
import { getAuth, requireAuth } from '../../middleware/auth';

const meProfileRoutes = new Hono();

meProfileRoutes.get('/', requireAuth, async (c) => {
  const auth = getAuth(c);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError({
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  }

  return jsonSuccess(c, user);
});

export default meProfileRoutes;
