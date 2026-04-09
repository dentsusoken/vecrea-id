import { createManagementApis } from 'user-management-apis';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  KeyedSession,
  InMemorySessionStore,
  defaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';
import { ApiClientImpl } from '@vecrea/au3te-ts-server/api';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import {
  createAu3teHandlers,
  type Au3teHonoEnv,
} from './composition/createAu3teHandlers';
import { createServerDeps } from './composition/createServerDeps';
import { readAu3teApiClientConfig } from './config/readAu3teApiClientConfig';
import { registerAu3teRoutes } from './routes/registerAu3teRoutes';

const AU3TE_SESSION_COOKIE = 'au3te_sid';

const app = new Hono<Au3teHonoEnv>();

const cognito = new CognitoIdentityProviderClient({});

const sessionStore = new InMemorySessionStore();

app.use(async (c, next) => {
  const existingSid = getCookie(c, AU3TE_SESSION_COOKIE);
  const issuedNewCookie = !existingSid;
  const sessionId = existingSid ?? sessionStore.createSessionId();

  const session = new KeyedSession(
    defaultSessionSchemas,
    sessionId,
    sessionStore
  );

  const apiClient = new ApiClientImpl(readAu3teApiClientConfig(c));

  const serverDeps = createServerDeps(c, {
    session,
    apiClient,
  });

  c.set('au3teHandlers', createAu3teHandlers(serverDeps));

  await next();

  if (issuedNewCookie) {
    setCookie(c, AU3TE_SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure:
        c.req.header('x-forwarded-proto') === 'https' ||
        c.req.url.startsWith('https:'),
    });
  }
});

app.route(
  '/',
  createManagementApis(cognito, {
    basePath: '/manage',
  })
);

registerAu3teRoutes(app);

app.get('/', (c) => c.text('Hello'));

export { app };
