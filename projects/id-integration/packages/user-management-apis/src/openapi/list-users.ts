import { createRoute } from '@hono/zod-openapi';
import {
  listUsersQuerySchema,
  listUsersResponseSchema,
} from '../schemas/user';
import {
  error401,
  error403,
  error422,
  error500,
} from './common';

/**
 * `GET /users` — list users (ListUsers-style pagination).
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
    422: error422,
    500: error500,
  },
});
