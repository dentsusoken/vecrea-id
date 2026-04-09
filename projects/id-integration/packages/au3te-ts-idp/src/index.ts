import { createManagementApis } from 'user-management-apis';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { InMemorySessionStore } from '@vecrea/au3te-ts-server/session';
import { Hono } from 'hono';
import type { Au3teHonoEnv } from './composition/createAu3teHandlers';
import { registerAu3teRoutes } from './routes/registerAu3teRoutes';
import { createAu3teSessionMiddleware } from './session/createAu3teSessionMiddleware';
import { handle } from 'hono/aws-lambda';

const app = new Hono<Au3teHonoEnv>();

const cognito = new CognitoIdentityProviderClient({});

const sessionStore = new InMemorySessionStore();

app.use(createAu3teSessionMiddleware({ sessionStore }));

app.route(
  '/',
  createManagementApis(cognito, {
    basePath: '/manage',
  })
);

registerAu3teRoutes(app);

app.get('/', (c) => c.text('Hello'));

const handler = handle(app);
export { app, handler };
