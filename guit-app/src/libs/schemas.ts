import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const optionalPaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().min(1).optional(),
});

export const isoDateRangeSchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const moneyAmountSchema = z.number().finite();

export const authRegisterSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const authLoginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;
