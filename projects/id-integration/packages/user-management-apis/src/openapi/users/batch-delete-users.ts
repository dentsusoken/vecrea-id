import { createRoute } from '@hono/zod-openapi';
import {
  batchDeleteUsersRequestSchema,
  batchDeleteUsersResponseSchema,
} from '../../schemas/user';
import {
  error401,
  error403,
  error422,
  error429,
  error500,
} from '../common';

/**
 * `POST /users/batch-delete` — delete many Cognito users (`AdminDeleteUser` per username).
 *
 * Per-item failures are returned in the JSON body (HTTP 200) when the batch completes, mirroring
 * `POST /users/import-csv` partial-failure handling.
 *
 * @remarks Handler: {@link registerUsersRoutes}.
 */
export const batchDeleteUsersRoute = createRoute({
  method: 'post',
  path: '/users/batch-delete',
  tags: ['Users'],
  summary: 'Batch delete Cognito users',
  description:
    'Sends one `AdminDeleteUser` per listed username. Failed usernames are listed in `errors` when the response `failureCount` is non-zero; successful deletes are still applied.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: batchDeleteUsersRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        'Batch completed (check `errors` for per-username failures — HTTP 200 even when some calls fail)',
      content: {
        'application/json': {
          schema: batchDeleteUsersResponseSchema,
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
