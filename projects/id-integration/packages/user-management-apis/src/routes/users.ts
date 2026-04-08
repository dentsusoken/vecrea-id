/**
 * User routes: `createRoute` definitions from `openapi/users/*` plus handlers on a shared {@link OpenAPIHono}.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createUser } from '../cognito/createUser';
import { deleteUser } from '../cognito/deleteUser';
import { cognitoErrorResponse } from '../cognito/cognitoHttp';
import { requireStagingTableName } from '../cognito/env';
import { getUser } from '../cognito/getUser';
import { listUsers } from '../cognito/listUsers';
import { patchUser } from '../cognito/patchUser';
import { createUserRoute } from '../openapi/users/create-user';
import { deleteUserRoute } from '../openapi/users/delete-user';
import { getUserRoute } from '../openapi/users/get-user';
import { importUsersCsvRoute } from '../openapi/users/import-users-csv';
import { listUsersRoute } from '../openapi/users/list-users';
import { patchUserRoute } from '../openapi/users/patch-user';
import { importUsersCsv } from '../staging/importUsersCsv';

/**
 * Registers all User list/CRUD routes (`app.openapi`) on `app`.
 */
export function registerUsersRoutes(
  app: OpenAPIHono,
  cognito: CognitoIdentityProviderClient
): void {
  app.openapi(listUsersRoute, async (c) => {
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
    try {
      const body = c.req.valid('json');
      const user = await createUser(cognito, body);
      return c.json(user, 201);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(getUserRoute, async (c) => {
    try {
      const { userId } = c.req.valid('param');
      const user = await getUser(cognito, userId);
      return c.json(user, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(patchUserRoute, async (c) => {
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
    try {
      const { userId } = c.req.valid('param');
      await deleteUser(cognito, userId);
      return c.body(null, 204);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });

  app.openapi(importUsersCsvRoute, async (c) => {
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
      const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

      const result = await importUsersCsv(ddb, tableName, csvText);
      return c.json(result, 200);
    } catch (err) {
      return cognitoErrorResponse(c, err) as never;
    }
  });
}
