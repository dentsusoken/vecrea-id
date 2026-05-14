/**
 * User Management API — Hono app factory for Node, Cloudflare Workers, or other hosts.
 *
 * @packageDocumentation
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
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
 * @param dynamo - DynamoDB Document client for staging import/list (configure in the host alongside Cognito).
 * @param options.basePath - Optional prefix where routes are mounted (e.g. `/api/v1`). Omit for root.
 * @param options.getEnv - Optional env resolver (e.g. IdP `getIdpConfigRecord`) so `AU3TE_PUBLIC_PATH_PREFIX` and API Gateway stage are applied to Scalar / OpenAPI URLs.
 * @returns A Hono instance; mount at `/` or use `fetch` as a Workers handler.
 */
export function createManagementApis(
  cognito: CognitoIdentityProviderClient,
  dynamo: DynamoDBDocumentClient,
  options?: CreateManagementApisOptions
) {
  const base = normalizeBasePath(options?.basePath);
  const api = createOpenApiRoutes(cognito, dynamo, {
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

/** Default SDK clients; override with {@link createManagementApis} for production. */
const defaultCognito = new CognitoIdentityProviderClient({});
const defaultDynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Pre-built app using the default Cognito and DynamoDB clients (local dev / quickstarts). */
export const managementApis = createManagementApis(defaultCognito, defaultDynamo);
/** Default export: same as {@link managementApis}. */
export default managementApis;
