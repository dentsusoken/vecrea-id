import { createRoute } from '@hono/zod-openapi';
import { updateUserRequestSchema, userSchema } from '../schemas/user';
import {
  error401,
  error403,
  error404,
  error422,
  error429,
  error500,
  userIdPathParamsSchema,
} from './common';

/**
 * `PATCH /users/{userId}` — partial update (AdminUpdateUserAttributes, enable/disable, etc.).
 */
export const patchUserRoute = createRoute({
  method: 'patch',
  path: '/users/{userId}',
  tags: ['Users'],
  summary: 'Update user (partial)',
  security: [{ bearerAuth: [] }],
  request: {
    params: userIdPathParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateUserRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'User after update',
      content: {
        'application/json': {
          schema: userSchema,
        },
      },
    },
    401: error401,
    403: error403,
    404: error404,
    422: error422,
    429: error429,
    500: error500,
  },
});
