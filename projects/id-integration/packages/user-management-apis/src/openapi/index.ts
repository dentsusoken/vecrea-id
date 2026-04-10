/**
 * OpenAPI shell: security schemes, `app.doc`, Scalar, and composition of resource route modules.
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Scalar } from '@scalar/hono-api-reference';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  createBearerAuthMiddleware,
  type IntrospectionConfigSource,
} from '../auth';
import { registerStagingRoutes } from '../routes/staging';
import { registerUsersRoutes } from '../routes/users';
import { normalizeBasePath } from './basePath';
import {
  resolvePublicOpenApiJsonPath,
  resolvePublicServersPath,
  type GetManagementEnv,
} from './resolvePublicMountPath';

/** Options for {@link createOpenApiRoutes}. */
export type CreateOpenApiRoutesOptions = {
  /**
   * Path prefix where this app is mounted (e.g. `/api/v1`).
   * Used for Scalar’s OpenAPI `url` and for `servers` in the generated document.
   * Omit or use `/` for routes at the host root.
   */
  basePath?: string;
  /**
   * Optional bearer-token introspection configuration.
   * When provided, `/users` endpoints are protected by introspection middleware.
   * Pass a function to resolve config per request (e.g. from host context).
   */
  introspectionConfig?: IntrospectionConfigSource;
  /**
   * Lambda / Workers と同等の環境辞書（例: IdP の `getIdpConfigRecord`）。
   * 設定すると `AU3TE_PUBLIC_PATH_PREFIX` 等をここから読み、API Gateway ステージ付き URL と一致させる。
   */
  getEnv?: GetManagementEnv;
};

/** Options for {@link createManagementApis} (re-exported from entry). */
export type CreateManagementApisOptions = CreateOpenApiRoutesOptions;

/** Base OpenAPI document fields shared with `app.doc`. */
export const openApiInfo = {
  title: 'User Management API',
  version: '0.0.1',
  description:
    'Cognito-backed user CRUD (list, get, create, patch, delete, CSV import) plus DynamoDB staging inspection (`GET /staging/users`). When bearer introspection is enabled, each operation requires OAuth scopes such as manage:users:read|write|delete|import (see USER_MANAGEMENT_SCOPES in package exports).',
} as const;

/**
 * Builds the OpenAPI Hono app: registers security, user routes ({@link registerUsersRoutes}),
 * staging routes ({@link registerStagingRoutes}),
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
  const mountOpts = { getEnv: options?.getEnv };

  const app = new OpenAPIHono();

  if (options?.introspectionConfig) {
    const auth = createBearerAuthMiddleware(options.introspectionConfig);
    app.use('/users', auth);
    app.use('/users/*', auth);
    app.use('/staging', auth);
    app.use('/staging/*', auth);
  }

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'Cognito ID token or access token, depending on authorizer configuration.',
  });

  registerUsersRoutes(app, cognito);
  registerStagingRoutes(app);

  app.doc('/openapi.json', (c) => ({
    openapi: '3.0.3',
    info: { ...openApiInfo },
    servers: [
      {
        url: resolvePublicServersPath(c, base || undefined, mountOpts),
        description: 'API base path (includes API Gateway stage when applicable)',
      },
    ],
  }));

  app.get(
    '/docs',
    Scalar(async (c) => ({
      url: resolvePublicOpenApiJsonPath(c, base || undefined, mountOpts),
    }))
  );

  return app;
}

export {
  AU3TE_PUBLIC_PATH_PREFIX_ENV,
  USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV,
  buildLandingPageText,
  computePathPrefixBeforeMount,
  normalizePublicPrefix,
  resolvePublicDocsPath,
  resolvePublicOpenApiJsonPath,
  resolvePublicPathPrefix,
  resolvePublicServersPath,
  type GetManagementEnv,
  type ResolvePublicMountOptions,
} from './resolvePublicMountPath';

export { normalizeBasePath } from './basePath';
