/**
 * Staging table routes (DynamoDB import pipeline visibility).
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { USER_MANAGEMENT_SCOPES } from '../auth/scopes';
import { requiredScopesResponse } from '../auth/checkRequiredScopes';
import { listStagingUsers } from '../aws/dynamodb/listStagingUsers';
import { requireStagingTableName } from '../aws/env';
import { cognitoErrorResponse } from '../aws/cognito/cognitoHttp';
import { listStagingUsersRoute } from '../openapi/staging/list-staging-users';

/**
 * Registers staging routes on `app`.
 *
 * @param dynamo - DynamoDB Document client (same as CSV import; configured by host).
 */
export function registerStagingRoutes(
  app: OpenAPIHono,
  dynamo: DynamoDBDocumentClient
): void {
  app.openapi(listStagingUsersRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.READ]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const query = c.req.valid('query');
      const tableName = requireStagingTableName();
      const result = await listStagingUsers(dynamo, tableName, {
        limit: query.limit,
        paginationToken: query.paginationToken,
      });
      return c.json(result, 200);
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid paginationToken') {
        return c.json({ message: err.message }, 422) as never;
      }
      return cognitoErrorResponse(c, err) as never;
    }
  });
}
