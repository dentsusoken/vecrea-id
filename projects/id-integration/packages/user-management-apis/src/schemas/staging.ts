/**
 * OpenAPI / Zod schemas for DynamoDB staging table inspection (user import pipeline).
 */

import { z } from '@hono/zod-openapi';

/** Query for `GET /staging/users` (DynamoDB Scan with paging). */
export const listStagingUsersQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .openapi({
      param: { name: 'limit', in: 'query' },
      description: 'Max items evaluated per Scan page (default 25, max 100).',
      example: 25,
    }),
  paginationToken: z
    .string()
    .optional()
    .openapi({
      param: { name: 'paginationToken', in: 'query' },
      description:
        'Opaque token from a prior response encoding DynamoDB `LastEvaluatedKey`.',
    }),
});

/**
 * Staging `Item.data` with secrets stripped (password hash and reserved key).
 * Field shapes follow Cognito import CSV / `CognitoImportData`.
 */
export const stagingUserDataSanitizedSchema = z
  .record(z.string(), z.any())
  .openapi({
    description:
      '`Item.data` without `password_hash`. Other keys match Cognito import shape.',
  });

export const stagingUserItemSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: 'Partition key (`cognito:username` from CSV)' }),
    imported: z.boolean(),
    verified: z.boolean(),
    error: z
      .string()
      .optional()
      .openapi({
        description:
          'Error name written by import lambdas when Cognito create fails',
      }),
    errorMessage: z
      .string()
      .optional()
      .openapi({ description: 'Error message from failed import' }),
    data: stagingUserDataSanitizedSchema,
  })
  .openapi('StagingUserItem');

export const listStagingUsersResponseSchema = z
  .object({
    items: z.array(stagingUserItemSchema),
    paginationToken: z.string().optional().openapi({
      description: 'Present when more Scan pages exist',
    }),
  })
  .openapi('ListStagingUsersResponse');
