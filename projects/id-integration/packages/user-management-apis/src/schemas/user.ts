import { z } from '@hono/zod-openapi';

/** Cognito-style user status (user pool). */
export const userStatusSchema = z
  .enum([
    'UNCONFIRMED',
    'CONFIRMED',
    'ARCHIVED',
    'COMPROMISED',
    'UNKNOWN',
    'RESET_REQUIRED',
    'FORCE_CHANGE_PASSWORD',
  ])
  .openapi({ description: 'Cognito-style user status' });

export const userSchema = z
  .object({
    userId: z
      .string()
      .openapi({ description: 'Stable user identifier (e.g. Cognito sub)' }),
    username: z
      .string()
      .openapi({ description: 'Sign-in username in the user pool' }),
    email: z
      .union([z.string().email(), z.null()])
      .openapi({ description: 'Email address' }),
    emailVerified: z.boolean().optional(),
    phoneNumber: z.union([z.string(), z.null()]).optional(),
    phoneNumberVerified: z.boolean().optional(),
    status: userStatusSchema,
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    attributes: z
      .record(z.string(), z.string())
      .optional()
      .openapi({
        description: 'Standard and custom attributes as string map',
      }),
  })
  .openapi('User');

export const errorBodySchema = z
  .object({
    message: z.string(),
    code: z.string().optional(),
  })
  .openapi('ErrorBody');

export type User = z.infer<typeof userSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
