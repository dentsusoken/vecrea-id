import { createRoute, z } from '@hono/zod-openapi';
import { importUsersCsvResponseSchema } from '../../schemas/user';
import {
  error401,
  error403,
  error422,
  error429,
  error500,
} from '../common';

/**
 * `POST /users/import-csv` — parse a Cognito-format CSV and write rows to the DynamoDB staging table.
 *
 * The CSV is validated against `cognitoImportDataSchema` (header row required, at minimum `cognito:username`).
 * Each valid row is stored as a staging item (`id`, `data`, `imported`, `verified`).
 * Actual Cognito user creation is deferred to the **Migrate user** trigger (`UserMigration_Authentication`).
 *
 * @remarks Handler: {@link registerUsersRoutes} in `routes/users.ts`.
 */
export const importUsersCsvRoute = createRoute({
  method: 'post',
  path: '/users/import-csv',
  tags: ['Users'],
  summary: 'Import users from CSV to staging table',
  description:
    'Upload a Cognito user-export style CSV to write staging items into DynamoDB. ' +
    'The first row must be a header. Required column: `cognito:username`. ' +
    'Recognised columns: `cognito:username`, `email`, `email_verified`, `phone_number`, `phone_number_verified`, ' +
    '`given_name`, `family_name`, `name`, `middle_name`, `nickname`, `preferred_username`, `profile`, `picture`, ' +
    '`website`, `gender`, `birthdate` (mm/dd/yyyy), `zoneinfo`, `locale`, `address`, `updated_at` (epoch seconds), ' +
    '`cognito:mfa_enabled`, `password_hash`. ' +
    'Each valid row is persisted to the staging table; actual Cognito migration happens on first sign-in via the Migrate user trigger.',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      importBatchId: z
        .string()
        .min(1)
        .optional()
        .openapi({
          param: { name: 'importBatchId', in: 'query' },
          description:
            'Optional. When omitted, the server generates a new UUID; all valid CSV rows are tagged with it for `GET /staging/users?importBatchId=...`.',
        }),
    }),
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: z
            .object({
              /** Runtime value is `File` / `Blob` from multipart; OpenAPI still describes binary upload. */
              file: z
                .custom<File | Blob>(
                  (v) => v instanceof File || v instanceof Blob,
                  { message: 'Expected a file upload in field "file"' }
                )
                .openapi({
                  type: 'string',
                  format: 'binary',
                  description: 'Cognito user-export style CSV file',
                }),
            })
            .openapi('ImportUsersCsvRequest'),
        },
      },
    },
  },
  responses: {
    200: {
      description:
        'Staging import completed (may contain partial failures — check `errors`)',
      content: {
        'application/json': {
          schema: importUsersCsvResponseSchema,
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
