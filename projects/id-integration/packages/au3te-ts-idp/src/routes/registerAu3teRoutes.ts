import { SERVICE_JWKS_PATH } from '@vecrea/au3te-ts-server/handler.service-jwks';
import { TOKEN_PATH } from '@vecrea/au3te-ts-server/handler.token';
import type { Hono } from 'hono';
import type { Au3teHandlers } from '../composition/createAu3teHandlers';

/** au3te-ts-server ハンドラーを Hono に載せる */
export function registerAu3teRoutes(
  app: Hono,
  handlers: Au3teHandlers
): void {
  app.get(SERVICE_JWKS_PATH, (c) =>
    handlers.serviceJwks.processRequest(c.req.raw)
  );

  app.post(TOKEN_PATH, (c) => handlers.token.processRequest(c.req.raw));
}
