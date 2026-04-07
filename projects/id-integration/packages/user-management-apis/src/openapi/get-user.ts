import { createRoute } from '@hono/zod-openapi';
import {
  userSchema,
} from '../schemas/user';
import {
  error401,
  error403,
  error404,
  error429,
  error500,
  userIdPathParamsSchema,
} from './common';

/**
 * `GET /users/{userId}` — fetch one user (Cognito `AdminGetUser`).
 *
 * @remarks Path `userId` is passed as Cognito `Username`. Implements {@link getUser}.
 */
export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{userId}',
  tags: ['Users'],
  summary: 'Get user by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: userIdPathParamsSchema,
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
    401: error401,
    403: error403,
    404: error404,
    429: error429,
    500: error500,
  },
});
