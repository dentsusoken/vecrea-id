import { authorizationPageModelSchema } from '@vecrea/au3te-ts-common/schemas.authorization-page';
import { AUTHORIZATION_PATH } from '@vecrea/au3te-ts-server/handler.authorization';
import {
  AUTHORIZATION_DECISION_PATH,
} from '@vecrea/au3te-ts-server/handler.authorization-decision';
import { SERVICE_JWKS_PATH } from '@vecrea/au3te-ts-server/handler.service-jwks';
import { TOKEN_PATH } from '@vecrea/au3te-ts-server/handler.token';
import type { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import type { Au3teHandlers } from '../composition/createAu3teHandlers';
import { AuthorizationConsentPage } from '../views/AuthorizationConsentPage';
import { applyUpstreamSetCookiesToContext } from './forwardSetCookie';

/** au3te-ts-server ハンドラーを Hono に載せる */
export function registerAu3teRoutes(
  app: Hono,
  handlers: Au3teHandlers
): void {
  app.get(SERVICE_JWKS_PATH, (c) =>
    handlers.serviceJwks.processRequest(c.req.raw)
  );

  app.get(
    AUTHORIZATION_PATH,
    jsxRenderer(({ children }) => (
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Authorize</title>
        </head>
        <body>{children}</body>
      </html>
    )),
    async (c) => {
      const upstream = await handlers.authorization.processRequest(c.req.raw);
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

      const parsed = authorizationPageModelSchema.safeParse(json);
      if (!parsed.success) {
        return new Response(text, {
          status: upstream.status,
          headers: upstream.headers,
        });
      }

      applyUpstreamSetCookiesToContext(c, upstream);

      return c.render(
        <AuthorizationConsentPage
          model={parsed.data}
          decisionPath={AUTHORIZATION_DECISION_PATH}
        />
      );
    }
  );

  app.post(AUTHORIZATION_DECISION_PATH, (c) =>
    handlers.authorizationDecision.processRequest(c.req.raw)
  );

  app.post(TOKEN_PATH, (c) => handlers.token.processRequest(c.req.raw));
}
