import { authorizationPageModelSchema } from '@vecrea/au3te-ts-common/schemas.authorization-page';
import { AUTHORIZATION_PATH } from '@vecrea/au3te-ts-server/handler.authorization';
import {
  AUTHORIZATION_DECISION_PATH,
} from '@vecrea/au3te-ts-server/handler.authorization-decision';
import { FEDERATION_CALLBACK_PATH } from '@vecrea/au3te-ts-server/handler.federation-callback';
import { FEDERATION_INITIATION_PATH } from '@vecrea/au3te-ts-server/handler.federation-initiation';
import { PAR_PATH } from '@vecrea/au3te-ts-server/handler.par';
import {
  AUTHORIZATION_SERVER_METADATA_PATH,
  OPENID_CONFIGURATION_PATH,
} from '@vecrea/au3te-ts-server/handler.service-configuration';
import { SERVICE_JWKS_PATH } from '@vecrea/au3te-ts-server/handler.service-jwks';
import { TOKEN_PATH } from '@vecrea/au3te-ts-server/handler.token';
import type { Context, Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import type { Au3teHonoEnv } from '../composition/createAu3teHandlers';
import { AuthorizationConsentPage } from '../views/AuthorizationConsentPage';
import { applyUpstreamSetCookiesToContext } from './forwardSetCookie';
import { normalizeAuthorizationPageModelJson } from './normalizeAuthorizationPageModelJson';
import { resolvePublicApiPath } from './resolvePublicApiPath';

const FEDERATION_INITIATION_PREFIX =
  FEDERATION_INITIATION_PATH.replace(/\/:[^/]+$/, '');

const authorizationConsentDocumentRenderer = jsxRenderer(({ children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Authorize</title>
    </head>
    <body>{children}</body>
  </html>
));

/**
 * `application/json` の {@link authorizationPageModelSchema} なら同意画面 HTML に変換する。
 * それ以外は上流 `Response` をそのまま返す。
 */
async function respondWithAuthorizationConsentIfJson(
  c: Context<Au3teHonoEnv>,
  upstream: Response
): Promise<Response> {
  const ct = upstream.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return upstream;
  }

  const text = await upstream.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(text, {
      status: upstream.status,
      headers: upstream.headers,
    });
  }

  const parsed = authorizationPageModelSchema.safeParse(
    normalizeAuthorizationPageModelJson(json)
  );
  if (!parsed.success) {
    return new Response(text, {
      status: upstream.status,
      headers: upstream.headers,
    });
  }

  applyUpstreamSetCookiesToContext(c, upstream);

  c.header('Cache-Control', 'no-store');

  return c.render(
    <AuthorizationConsentPage
      model={parsed.data}
      decisionPath={resolvePublicApiPath(c, AUTHORIZATION_DECISION_PATH)}
      federationInitiationPathPrefix={resolvePublicApiPath(
        c,
        FEDERATION_INITIATION_PREFIX
      )}
    />
  );
}

/** au3te-ts-server ハンドラーを Hono に載せる（`au3teHandlers` はミドルウェアで注入） */
export function registerAu3teRoutes(app: Hono<Au3teHonoEnv>): void {
  app.get(SERVICE_JWKS_PATH, (c) =>
    c.get('au3teHandlers').serviceJwks.processRequest(c.req.raw)
  );

  app.get(OPENID_CONFIGURATION_PATH, (c) =>
    c.get('au3teHandlers').openIdConfiguration.processRequest(c.req.raw)
  );

  app.get(AUTHORIZATION_SERVER_METADATA_PATH, (c) =>
    c
      .get('au3teHandlers')
      .authorizationServerMetadata.processRequest(c.req.raw)
  );

  const federationInit = (c: Context<Au3teHonoEnv>) =>
    c.get('au3teHandlers').federationInitiation.processRequest(c.req.raw);

  app.get(FEDERATION_INITIATION_PATH, federationInit);
  app.post(FEDERATION_INITIATION_PATH, federationInit);

  const federationCallbackHandler = async (c: Context<Au3teHonoEnv>) => {
    const upstream = await c
      .get('au3teHandlers')
      .federationCallback.processRequest(c.req.raw);
    return respondWithAuthorizationConsentIfJson(c, upstream);
  };

  app.get(
    FEDERATION_CALLBACK_PATH,
    authorizationConsentDocumentRenderer,
    federationCallbackHandler
  );
  app.post(
    FEDERATION_CALLBACK_PATH,
    authorizationConsentDocumentRenderer,
    federationCallbackHandler
  );

  app.get(
    AUTHORIZATION_PATH,
    authorizationConsentDocumentRenderer,
    async (c) => {
      const upstream = await c
        .get('au3teHandlers')
        .authorization.processRequest(c.req.raw);
      return respondWithAuthorizationConsentIfJson(c, upstream);
    }
  );

  app.post(AUTHORIZATION_DECISION_PATH, (c) =>
    c.get('au3teHandlers').authorizationDecision.processRequest(c.req.raw)
  );

  app.post(PAR_PATH, (c) =>
    c.get('au3teHandlers').par.processRequest(c.req.raw)
  );

  app.post(TOKEN_PATH, (c) =>
    c.get('au3teHandlers').token.processRequest(c.req.raw)
  );
}
