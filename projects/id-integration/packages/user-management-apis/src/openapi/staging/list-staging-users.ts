import { createRoute } from '@hono/zod-openapi';
import {
  listStagingUsersQuerySchema,
  listStagingUsersResponseSchema,
} from '../../schemas/staging';
import {
  error401,
  error403,
  error422,
  error429,
  error500,
} from '../common';

/**
 * `GET /staging/users` — scan one page of DynamoDB staging items (import pipeline state).
 *
 * **Note:** Uses DynamoDB Scan; suitable for operator review, not high-frequency polling.
 * Requires `manage:users:read`. Handler: {@link registerStagingRoutes}.
 */
export const listStagingUsersRoute = createRoute({
  method: 'get',
  path: '/staging/users',
  tags: ['Staging'],
  summary: 'List staging import rows',
  description:
    'Returns a page of DynamoDB staging items (`id`, `imported`, `verified`, optional import errors, sanitized `data` without `password_hash`). Uses Scan; pass `paginationToken` for the next page.',
  security: [{ bearerAuth: [] }],
  request: {
    query: listStagingUsersQuerySchema,
  },
  responses: {
    200: {
      description: 'Page of staging rows',
      content: {
        'application/json': {
          schema: listStagingUsersResponseSchema,
        },
      },
    },
    401: error401,
    403: error403,
    422: error422,
    429: error429,
    500: error500,
  },
});
