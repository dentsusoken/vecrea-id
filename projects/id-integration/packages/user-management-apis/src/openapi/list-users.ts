import { createRoute } from '@hono/zod-openapi';
import {
  listUsersQuerySchema,
  listUsersResponseSchema,
} from '../schemas/user';
import {
  error401,
  error403,
  error404,
  error422,
  error429,
  error500,
} from './common';

/**
 * `GET /users` — list users (Cognito `ListUsers`).
 *
 * @remarks Implements {@link listUsers} in `openapi/index.ts`.
 */
export const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['Users'],
  summary: 'List users',
  security: [{ bearerAuth: [] }],
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    200: {
      description: 'Page of users',
      content: {
        'application/json': {
          schema: listUsersResponseSchema,
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
