import { z } from 'zod';

export const creditSchema = z.object({
  credit_id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['ready', 'issued']),
  expire_at: z.number().int().nonnegative(),
});

export const updateCreditSchema = z
  .object({
    id: z.string().min(1),
    credit: creditSchema,
  })
  .refine((input) => input.id === input.credit.credit_id, {
    message: 'id and credit.credit_id must match',
    path: ['id'],
  });

export type UpdateCreditSchema = z.infer<typeof updateCreditSchema>;
