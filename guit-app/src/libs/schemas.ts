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

export const accountIdParamSchema = z.object({
  accountId: z.coerce.number().int().positive(),
});

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(50),
  balance: z.number().finite(),
});

export const accountUpdateSchema = accountCreateSchema.partial().refine((value) => {
  return value.name !== undefined || value.type !== undefined || value.balance !== undefined;
}, 'At least one field must be provided');

export const budgetIdParamSchema = z.object({
  budgetId: z.coerce.number().int().positive(),
});

export const budgetCreateSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().finite(),
  period: z.string().trim().min(1).max(20),
});

export const budgetUpdateSchema = budgetCreateSchema.partial().refine((value) => {
  return value.categoryId !== undefined || value.amount !== undefined || value.period !== undefined;
}, 'At least one field must be provided');

const transactionTypeSchema = z.enum(['expense', 'income']);

export const transactionIdParamSchema = z.object({
  transactionId: z.coerce.number().int().positive(),
});

export const transactionCreateSchema = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  type: transactionTypeSchema,
  date: z.iso.datetime(),
  description: z.string().trim().min(1).max(500).optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial().refine((value) => {
  return (
    value.accountId !== undefined ||
    value.categoryId !== undefined ||
    value.amount !== undefined ||
    value.type !== undefined ||
    value.date !== undefined ||
    value.description !== undefined
  );
}, 'At least one field must be provided');

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;
export type AccountIdParam = z.infer<typeof accountIdParamSchema>;
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type BudgetIdParam = z.infer<typeof budgetIdParamSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
