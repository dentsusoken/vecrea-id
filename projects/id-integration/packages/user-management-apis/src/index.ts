/**
 * User Management API — Hono app factory for Node, Cloudflare Workers, or other hosts.
 *
 * @packageDocumentation
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import {
  createOpenApiRoutes,
  landingPageText,
  normalizeBasePath,
  type CreateManagementApisOptions,
} from './openapi';

export type { CreateManagementApisOptions, CreateOpenApiRoutesOptions } from './openapi';
export { createOpenApiRoutes, normalizeBasePath } from './openapi';
export { registerUsersRoutes } from './routes/users';

/**
 * Builds a Hono app with OpenAPI routes and a landing message at the mount path.
 *
 * @param cognito - SDK client used for all Cognito Admin API calls (configure region/credentials in the host).
 * @param options.basePath - Optional prefix where routes are mounted (e.g. `/api/v1`). Omit for root.
 * @returns A Hono instance; mount at `/` or use `fetch` as a Workers handler.
 */
export function createManagementApis(
  cognito: CognitoIdentityProviderClient,
  options?: CreateManagementApisOptions
) {
  const base = normalizeBasePath(options?.basePath);
  const api = createOpenApiRoutes(cognito, { basePath: base });
  const app = new Hono();
  const mountPath = base === '' ? '/' : base;

  app.get(mountPath, (c) => c.text(landingPageText(base)));
  app.route(mountPath, api);

  return app;
}

/** Default SDK client; override with {@link createManagementApis} for production. */
const defaultCognito = new CognitoIdentityProviderClient({});

/** Pre-built app using the default Cognito client (local dev / quickstarts). */
export const managementApis = createManagementApis(defaultCognito);
/** Default export: same as {@link managementApis}. */
export default managementApis;
