/**
 * OpenAPI shell: security schemes, `app.doc`, Scalar, and composition of resource route modules.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Scalar } from '@scalar/hono-api-reference';
import { OpenAPIHono } from '@hono/zod-openapi';
import { registerUsersRoutes } from '../routes/users';
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
 * Builds the OpenAPI Hono app: registers security, user routes ({@link registerUsersRoutes}),
 * `/openapi.json`, and `/docs` (Scalar).
 *
 * @param options.basePath - If the host mounts this app under a prefix, pass it so `/docs` and `servers` match.
 * @returns An `OpenAPIHono` instance (mount or use `fetch` as a Workers handler).
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

  registerUsersRoutes(app, cognito);

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
