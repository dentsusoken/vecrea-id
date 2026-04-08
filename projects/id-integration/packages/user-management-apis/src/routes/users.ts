/**
 * User API — HTTP handler implementations (Cognito). No OpenAPI `createRoute` / `app.openapi` here.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { RouteHandler } from '@hono/zod-openapi';
import { createUser } from '../cognito/createUser';
import { deleteUser } from '../cognito/deleteUser';
import { cognitoErrorResponse } from '../cognito/cognitoHttp';
import { getUser } from '../cognito/getUser';
import { listUsers } from '../cognito/listUsers';
import { patchUser } from '../cognito/patchUser';

/** Wiring of handlers to OpenAPI route types lives only at the type level (`import('...')`). */
export type UserRouteHandlers = {
  listUsers: RouteHandler<
    typeof import('../openapi/users/list-users').listUsersRoute
  >;
  createUser: RouteHandler<
    typeof import('../openapi/users/create-user').createUserRoute
  >;
  getUser: RouteHandler<
    typeof import('../openapi/users/get-user').getUserRoute
  >;
  patchUser: RouteHandler<
    typeof import('../openapi/users/patch-user').patchUserRoute
  >;
  deleteUser: RouteHandler<
    typeof import('../openapi/users/delete-user').deleteUserRoute
  >;
};

/**
 * Handlers for list/create/get/patch/delete user. Pair with `createRoute` definitions in `openapi/users/*`
 * via {@link registerUsersOpenApi}.
 */
export function createUserHandlers(
  cognito: CognitoIdentityProviderClient
): UserRouteHandlers {
  return {
    listUsers: async (c) => {
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
    },

    createUser: async (c) => {
      try {
        const body = c.req.valid('json');
        const user = await createUser(cognito, body);
        return c.json(user, 201);
      } catch (err) {
        return cognitoErrorResponse(c, err) as never;
      }
    },

    getUser: async (c) => {
      try {
        const { userId } = c.req.valid('param');
        const user = await getUser(cognito, userId);
        return c.json(user, 200);
      } catch (err) {
        return cognitoErrorResponse(c, err) as never;
      }
    },

    patchUser: async (c) => {
      try {
        const { userId } = c.req.valid('param');
        const body = c.req.valid('json');
        const user = await patchUser(cognito, userId, body);
        return c.json(user, 200);
      } catch (err) {
        return cognitoErrorResponse(c, err) as never;
      }
    },

    deleteUser: async (c) => {
      try {
        const { userId } = c.req.valid('param');
        await deleteUser(cognito, userId);
        return c.body(null, 204);
      } catch (err) {
        return cognitoErrorResponse(c, err) as never;
      }
    },
  };
}
