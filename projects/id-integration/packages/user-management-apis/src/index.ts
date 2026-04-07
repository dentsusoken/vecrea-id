import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import { createOpenApiRoutes } from './openapi';

export function createManagementApis(cognito: CognitoIdentityProviderClient) {
  const app = new Hono();
  app.route('/', createOpenApiRoutes(cognito));
  app.get('/', (c) =>
    c.text('User Management API — OpenAPI: /openapi.json, UI: /docs')
  );
  return app;
}

const defaultCognito = new CognitoIdentityProviderClient({});

export const managementApis = createManagementApis(defaultCognito);
export { createOpenApiRoutes } from './openapi';
export default managementApis;
