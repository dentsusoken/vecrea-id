import { createRoute } from '@hono/zod-openapi';
import {
  batchDeleteStagingUsersRequestSchema,
  batchDeleteStagingUsersResponseSchema,
} from '../../schemas/staging';
import {
  error401,
  error403,
  error422,
  error429,
  error500,
} from '../common';

/**
 * `POST /staging/users/batch-delete` — delete many staging import rows by `id` (DynamoDB `DeleteItem`).
 *
 * @remarks Handler: {@link registerStagingRoutes}.
 */
export const batchDeleteStagingUsersRoute = createRoute({
  method: 'post',
  path: '/staging/users/batch-delete',
  tags: ['Staging'],
  summary: 'Batch delete staging import rows',
  description:
    'Removes items from the import staging table by primary key `id` (same as `cognito:username` on imported rows). ' +
    'Per-id failures are listed in `errors` when `failureCount` is non-zero.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: batchDeleteStagingUsersRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        'Batch completed (check `errors` for per-id failures — HTTP 200 when the handler finishes)',
      content: {
        'application/json': {
          schema: batchDeleteStagingUsersResponseSchema,
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
