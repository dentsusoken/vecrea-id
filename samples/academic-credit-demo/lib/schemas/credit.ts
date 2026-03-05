import { z } from 'zod';

export const creditSchema = z.object({
  credit_id: z.string().min(1),
  student_id: z.string().min(1),
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  academic_term: z.string().min(1),
  grade: z.enum(['A', 'B', 'C']),
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
