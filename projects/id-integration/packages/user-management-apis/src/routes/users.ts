/**
 * User routes: `createRoute` definitions from `openapi/users/*` plus handlers on a shared {@link OpenAPIHono}.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createUser } from '../cognito/createUser';
import { deleteUser } from '../cognito/deleteUser';
import { cognitoErrorResponse } from '../cognito/cognitoHttp';
import { getUser } from '../cognito/getUser';
import { listUsers } from '../cognito/listUsers';
import { patchUser } from '../cognito/patchUser';
import { createUserRoute } from '../openapi/users/create-user';
import { deleteUserRoute } from '../openapi/users/delete-user';
import { getUserRoute } from '../openapi/users/get-user';
import { listUsersRoute } from '../openapi/users/list-users';
import { patchUserRoute } from '../openapi/users/patch-user';

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
}
