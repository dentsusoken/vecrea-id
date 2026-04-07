/**
 * User Management API — Hono app factory for Node, Cloudflare Workers, or other hosts.
 *
 * @packageDocumentation
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import { createOpenApiRoutes } from './openapi';

/**
 * Builds a Hono app with OpenAPI routes and a root landing message.
 *
 * @param cognito - SDK client used for all Cognito Admin API calls (configure region/credentials in the host).
 * @returns A Hono instance; mount at `/` or use `fetch` as a Workers handler.
 */
export function createManagementApis(cognito: CognitoIdentityProviderClient) {
  const app = new Hono();
  app.route('/', createOpenApiRoutes(cognito));
  app.get('/', (c) =>
    c.text('User Management API — OpenAPI: /openapi.json, UI: /docs')
  );
  return app;
}

/** Default SDK client; override with {@link createManagementApis} for production. */
const defaultCognito = new CognitoIdentityProviderClient({});

/** Pre-built app using the default Cognito client (local dev / quickstarts). */
export const managementApis = createManagementApis(defaultCognito);
export { createOpenApiRoutes } from './openapi';
/** Default export: same as {@link managementApis}. */
export default managementApis;
