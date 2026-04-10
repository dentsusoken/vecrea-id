import { createManagementApis } from 'user-management-apis';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { Context } from 'hono';
import { Hono } from 'hono';
import type { Au3teHonoEnv } from './composition/createAu3teHandlers';
import { registerAu3teRoutes } from './routes/registerAu3teRoutes';
import { createAu3teSessionMiddleware } from './session/createAu3teSessionMiddleware';
import { createAu3teSessionStore } from './session/createSessionStore';
import { ensureIdpSecretEnvLoaded } from './aws/idp/secretEnvOverlay';
import { getIdpConfigRecord } from './config/getIdpConfigRecord';
import { handle } from 'hono/aws-lambda';

const app = new Hono<Au3teHonoEnv>();

app.use(async (c, next) => {
  await ensureIdpSecretEnvLoaded();
  await next();
});

const cognito = new CognitoIdentityProviderClient({});

const sessionStore = createAu3teSessionStore();

app.use(createAu3teSessionMiddleware({ sessionStore }));

app.route(
  '/',
  createManagementApis(cognito, {
    basePath: '/api/manage',
    getEnv: getIdpConfigRecord,
    introspectionConfig: (c: Context<Au3teHonoEnv>) =>
      c.get('au3teHandlers').introspection,
  })
);

registerAu3teRoutes(app);

app.get('/', (c) => c.text('Hello'));

const handler = handle(app);
export { app, handler };
