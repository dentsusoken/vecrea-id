/**
 * User Management API — Hono app factory for Node, Cloudflare Workers, or other hosts.
 *
 * @packageDocumentation
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import './auth/context';
import {
  buildLandingPageText,
  createOpenApiRoutes,
  normalizeBasePath,
  type CreateManagementApisOptions,
} from './openapi';

export type { CreateManagementApisOptions, CreateOpenApiRoutesOptions } from './openapi';
export {
  AU3TE_PUBLIC_PATH_PREFIX_ENV,
  USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV,
  buildLandingPageText,
  computePathPrefixBeforeMount,
  createOpenApiRoutes,
  normalizeBasePath,
  normalizePublicPrefix,
  resolvePublicDocsPath,
  resolvePublicOpenApiJsonPath,
  resolvePublicPathPrefix,
  resolvePublicServersPath,
  type GetManagementEnv,
  type ResolvePublicMountOptions,
} from './openapi';

export {
  createBearerAuthMiddleware,
  requiredScopesResponse,
  USER_MANAGEMENT_SCOPES,
  type IntrospectionConfigSource,
  type UserManagementScope,
} from './auth';
export { registerUsersRoutes } from './routes/users';

/**
 * Builds a Hono app with OpenAPI routes and a landing message at the mount path.
 *
 * @param cognito - SDK client used for all Cognito Admin API calls (configure region/credentials in the host).
 * @param options.basePath - Optional prefix where routes are mounted (e.g. `/api/v1`). Omit for root.
 * @param options.getEnv - Optional env resolver (e.g. IdP `getIdpConfigRecord`) so `AU3TE_PUBLIC_PATH_PREFIX` and API Gateway stage are applied to Scalar / OpenAPI URLs.
 * @returns A Hono instance; mount at `/` or use `fetch` as a Workers handler.
 */
export function createManagementApis(
  cognito: CognitoIdentityProviderClient,
  options?: CreateManagementApisOptions
) {
  const base = normalizeBasePath(options?.basePath);
  const api = createOpenApiRoutes(cognito, {
    basePath: base,
    introspectionConfig: options?.introspectionConfig,
    getEnv: options?.getEnv,
  });
  const app = new Hono();
  const mountPath = base === '' ? '/' : base;
  const mountOpts = { getEnv: options?.getEnv };

  app.get(mountPath, (c) =>
    c.text(buildLandingPageText(c, base || undefined, mountOpts))
  );
  app.route(mountPath, api);

  return app;
}

/** Default SDK client; override with {@link createManagementApis} for production. */
const defaultCognito = new CognitoIdentityProviderClient({});

/** Pre-built app using the default Cognito client (local dev / quickstarts). */
export const managementApis = createManagementApis(defaultCognito);
/** Default export: same as {@link managementApis}. */
export default managementApis;
