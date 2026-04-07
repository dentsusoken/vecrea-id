/**
 * OpenAPI route registration (`@hono/zod-openapi`) and Scalar UI (`/docs`).
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Scalar } from '@scalar/hono-api-reference';
import { OpenAPIHono } from '@hono/zod-openapi';
import { createUser } from '../cognito/createUser';
import { deleteUser } from '../cognito/deleteUser';
import { cognitoErrorResponse } from '../cognito/cognitoHttp';
import { getUser } from '../cognito/getUser';
import { listUsers } from '../cognito/listUsers';
import { patchUser } from '../cognito/patchUser';
import { createUserRoute } from './create-user';
import { deleteUserRoute } from './delete-user';
import { getUserRoute } from './get-user';
import { listUsersRoute } from './list-users';
import { patchUserRoute } from './patch-user';
import { normalizeBasePath } from './basePath';

/** Options for {@link createOpenApiRoutes}. */
export type CreateOpenApiRoutesOptions = {
  /**
   * Path prefix where this app is mounted (e.g. `/api/v1`).
   * Used for Scalar’s OpenAPI `url` and for `servers` in the generated document.
   * Omit or use `/` for routes at the host root.
   */
  basePath?: string;
};

/** Options for {@link createManagementApis} (re-exported from entry). */
export type CreateManagementApisOptions = CreateOpenApiRoutesOptions;

/** Base OpenAPI document fields shared with `app.doc`. */
export const openApiInfo = {
  title: 'User Management API',
  version: '0.0.1',
  description:
    'Cognito-backed user CRUD-style operations (list, get, create, patch, delete). Wire to Admin* APIs in the hosting project.',
} as const;

/** Example server entries for `app.doc` / exported OpenAPI document. */
export const openApiServers = [
  {
    url: 'https://api.example.com/v1',
    description: 'Replace with your stage URL',
  },
] as const;

/**
 * Registers OpenAPI-documented user routes and wires them to Cognito helpers.
 *
 * @param cognito - Passed to list/create/get/patch/delete handlers.
 * @param options.basePath - If the host mounts this app under a prefix, pass it so `/docs` and `servers` match.
 * @returns An `OpenAPIHono` app exposing `/openapi.json`, `/docs` (Scalar), and `/users/*` routes (relative to the mount point).
 */
export function createOpenApiRoutes(
  cognito: CognitoIdentityProviderClient,
  options?: CreateOpenApiRoutesOptions
): OpenAPIHono {
  const base = normalizeBasePath(options?.basePath);
  const openApiJsonHref = base === '' ? '/openapi.json' : `${base}/openapi.json`;

  const app = new OpenAPIHono();

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'Cognito ID token or access token, depending on authorizer configuration.',
  });

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

  app.doc('/openapi.json', {
    openapi: '3.0.3',
    info: { ...openApiInfo },
    servers:
      base === ''
        ? [...openApiServers]
        : [{ url: base, description: 'API base path (see hosting mount)' }],
  });

  app.get('/docs', Scalar({ url: openApiJsonHref }));

  return app;
}

/**
 * Text for the landing route (root of the mount).
 * @internal
 */
export function landingPageText(base: string): string {
  const openApiJsonHref = base === '' ? '/openapi.json' : `${base}/openapi.json`;
  const docsHref = base === '' ? '/docs' : `${base}/docs`;
  return `User Management API — OpenAPI: ${openApiJsonHref}, UI: ${docsHref}`;
}

export { normalizeBasePath } from './basePath';
