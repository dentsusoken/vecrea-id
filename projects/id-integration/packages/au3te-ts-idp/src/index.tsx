import { createManagementApis } from 'user-management-apis';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Context } from 'hono';
import { Hono } from 'hono';
import type { Au3teHonoEnv } from './composition/createAu3teHandlers';
import { registerAu3teRoutes } from './routes/registerAu3teRoutes';
import { createAu3teSessionMiddleware } from './session/createAu3teSessionMiddleware';
import { createAu3teSessionStore } from './session/createSessionStore';
import { ensureIdpSecretEnvLoaded } from './aws/idp/secretEnvOverlay';
import { getIdpConfigRecord } from './config/getIdpConfigRecord';
import { handle } from 'hono/aws-lambda';
import {
  AuthorizationServerIndexPage,
  USER_MANAGEMENT_BASE_PATH,
} from './views/AuthorizationServerIndexPage';

const app = new Hono<Au3teHonoEnv>();

app.use(async (c, next) => {
  await ensureIdpSecretEnvLoaded();
  await next();
});

const cognito = new CognitoIdentityProviderClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const sessionStore = createAu3teSessionStore();

app.use(createAu3teSessionMiddleware({ sessionStore }));

app.route(
  '/',
  createManagementApis(cognito, dynamo, {
    basePath: USER_MANAGEMENT_BASE_PATH,
    getEnv: getIdpConfigRecord,
    introspectionConfig: (c: Context<Au3teHonoEnv>) =>
      c.get('au3teHandlers').introspection,
  })
);

registerAu3teRoutes(app);

app.get('/', (c) => c.html(<AuthorizationServerIndexPage />));

const handler = handle(app);
export { app, handler };
