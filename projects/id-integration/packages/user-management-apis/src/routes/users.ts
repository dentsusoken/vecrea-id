/**
 * User routes: `createRoute` definitions from `openapi/users/*` plus handlers on a shared {@link OpenAPIHono}.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { requiredScopesResponse } from '../auth/checkRequiredScopes';
import { USER_MANAGEMENT_SCOPES } from '../auth/scopes';
import { createUser } from '../aws/cognito/createUser';
import { deleteUser } from '../aws/cognito/deleteUser';
import { deleteUsersBatch } from '../aws/cognito/deleteUsersBatch';
import { cognitoErrorResponse } from '../aws/cognito/cognitoHttp';
import { getUser } from '../aws/cognito/getUser';
import { listUsers } from '../aws/cognito/listUsers';
import { patchUser } from '../aws/cognito/patchUser';
import { importUsersCsvToStaging } from '../aws/dynamodb/importUsersCsvToStaging';
import { requireStagingTableName } from '../aws/env';
import { createUserRoute } from '../openapi/users/create-user';
import { batchDeleteUsersRoute } from '../openapi/users/batch-delete-users';
import { deleteUserRoute } from '../openapi/users/delete-user';
import { getUserRoute } from '../openapi/users/get-user';
import { importUsersCsvRoute } from '../openapi/users/import-users-csv';
import { listUsersRoute } from '../openapi/users/list-users';
import { patchUserRoute } from '../openapi/users/patch-user';

/**
 * Registers all User list/CRUD routes (`app.openapi`) on `app`, including batch delete and CSV import.
 *
 * @param dynamo - DynamoDB Document client (region/credentials configured by host, e.g. IdP Lambda).
 */
export function registerUsersRoutes(
  app: OpenAPIHono,
  cognito: CognitoIdentityProviderClient,
  dynamo: DynamoDBDocumentClient
): void {
  app.openapi(listUsersRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.READ]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const query = c.req.valid('query');
      const result = await listUsers(cognito, {
        limit: query.limit,
        paginationToken: query.paginationToken,
      });
      return c.json(result, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(createUserRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.WRITE]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const body = c.req.valid('json');
      const user = await createUser(cognito, body);
      return c.json(user, 201);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(getUserRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.READ]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const { userId } = c.req.valid('param');
      const user = await getUser(cognito, userId);
      return c.json(user, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(patchUserRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.WRITE]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const { userId } = c.req.valid('param');
      const body = c.req.valid('json');
      const user = await patchUser(cognito, userId, body);
      return c.json(user, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(deleteUserRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.DELETE]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const { userId } = c.req.valid('param');
      await deleteUser(cognito, userId);
      return c.body(null, 204);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(batchDeleteUsersRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.DELETE]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const body = c.req.valid('json');
      const result = await deleteUsersBatch(cognito, body.usernames);
      return c.json(result, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(importUsersCsvRoute, async (c) => {
    const scopeDenied = requiredScopesResponse(c, [USER_MANAGEMENT_SCOPES.IMPORT]);
    if (scopeDenied) return scopeDenied as never;
    try {
      const body = await c.req.parseBody();
      const file = body['file'];

      if (!file || typeof file === 'string') {
        return c.json(
          { message: 'A CSV file is required in the "file" field' },
          422
        ) as never;
      }

      const csvText = await file.text();
      const tableName = requireStagingTableName();

      const result = await importUsersCsvToStaging(dynamo, tableName, csvText);
      return c.json(result, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });
}
