import { createRoute } from '@hono/zod-openapi';
import { createUserRequestSchema, userSchema } from '../schemas/user';
import {
  error401,
  error403,
  error409,
  error422,
  error500,
} from './common';

/**
 * `POST /users` — create a user (AdminCreateUser).
 */
export const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  tags: ['Users'],
  summary: 'Create user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'User created',
      content: {
        'application/json': {
          schema: userSchema,
        },
      },
    },
    401: error401,
    403: error403,
    409: error409,
    422: error422,
    500: error500,
  },
});
