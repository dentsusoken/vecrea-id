import { z } from '@hono/zod-openapi';
import { errorBodySchema } from '../schemas/user';

/** Path parameter shared by single-user routes (`{userId}` lookup key). */
export const userIdPathParamsSchema = z.object({
  userId: z
    .string()
    .min(1)
    .openapi({
      param: { name: 'userId', in: 'path' },
      description:
        'User pool sub, username, or opaque id depending on deployment (lookup key for AdminGetUser / updates / delete).',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
});

export const error401 = {
  description: 'Missing or invalid bearer token',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error403 = {
  description: 'Caller is not allowed to perform this action',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error404 = {
  description: 'User does not exist',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error409 = {
  description: 'Conflict (e.g. username already exists)',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error422 = {
  description: 'Validation failed',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error429 = {
  description: 'Rate limited (TooManyRequestsException)',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;

export const error500 = {
  description: 'Internal error',
  content: {
    'application/json': {
      schema: errorBodySchema,
    },
  },
} as const;
