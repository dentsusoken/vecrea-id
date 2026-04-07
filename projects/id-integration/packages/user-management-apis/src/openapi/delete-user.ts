import { createRoute } from '@hono/zod-openapi';
import {
  error401,
  error403,
  error404,
  error429,
  error500,
  userIdPathParamsSchema,
} from './common';

/**
 * `DELETE /users/{userId}` — delete a user (Cognito `AdminDeleteUser`).
 *
 * @remarks Implements {@link deleteUser}.
 */
export const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/users/{userId}',
  tags: ['Users'],
  summary: 'Delete user',
  security: [{ bearerAuth: [] }],
  request: {
    params: userIdPathParamsSchema,
  },
  responses: {
    204: {
      description: 'User deleted',
    },
    401: error401,
    403: error403,
    404: error404,
    429: error429,
    500: error500,
  },
});
