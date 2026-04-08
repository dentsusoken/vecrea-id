/**
 * Binds User `createRoute` definitions to {@link createUserHandlers} for OpenAPI generation and validation.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createUserHandlers } from '../../routes/users';
import { createUserRoute } from './create-user';
import { deleteUserRoute } from './delete-user';
import { getUserRoute } from './get-user';
import { listUsersRoute } from './list-users';
import { patchUserRoute } from './patch-user';

/**
 * Registers User routes on `app` for OpenAPI (`app.openapi` + merged spec).
 */
export function registerUsersOpenApi(
  app: OpenAPIHono,
  cognito: CognitoIdentityProviderClient
): void {
  const h = createUserHandlers(cognito);
  app.openapi(listUsersRoute, h.listUsers);
  app.openapi(createUserRoute, h.createUser);
  app.openapi(getUserRoute, h.getUser);
  app.openapi(patchUserRoute, h.patchUser);
  app.openapi(deleteUserRoute, h.deleteUser);
}
