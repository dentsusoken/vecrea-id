import { createRoute, z } from '@hono/zod-openapi';
import { errorBodySchema, userSchema } from '../schemas/user';

const getUserParamsSchema = z.object({
  userId: z
    .string()
    .min(1)
    .openapi({
      param: { name: 'userId', in: 'path' },
      description:
        'User pool sub, username, or opaque id depending on deployment.',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
});

/**
 * `GET /users/{userId}` — OpenAPI route definition (formerly `openapi/get-user.json`).
 */
export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{userId}',
  tags: ['Users'],
  summary: 'Get user by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: getUserParamsSchema,
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: userSchema,
        },
      },
    },
    401: {
      description: 'Missing or invalid bearer token',
      content: {
        'application/json': {
          schema: errorBodySchema,
        },
      },
    },
    403: {
      description: 'Caller is not allowed to read this user',
      content: {
        'application/json': {
          schema: errorBodySchema,
        },
      },
    },
    404: {
      description: 'User does not exist',
      content: {
        'application/json': {
          schema: errorBodySchema,
        },
      },
    },
    500: {
      description: 'Internal error',
      content: {
        'application/json': {
          schema: errorBodySchema,
        },
      },
    },
  },
});
