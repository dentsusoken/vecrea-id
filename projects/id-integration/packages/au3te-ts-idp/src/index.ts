import { createManagementApis } from 'user-management-apis';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import { createAu3teHandlers } from './composition/createAu3teHandlers';
import { createServerDeps } from './composition/createServerDeps';
import { registerAu3teRoutes } from './routes/registerAu3teRoutes';

const app = new Hono();

const cognito = new CognitoIdentityProviderClient({});

app.route(
  '/',
  createManagementApis(cognito, {
    basePath: '/manage',
  })
);

const serverDeps = createServerDeps();
const au3teHandlers = createAu3teHandlers(serverDeps);
registerAu3teRoutes(app, au3teHandlers);

app.get('/', (c) => c.text('Hello'));

export { app };
