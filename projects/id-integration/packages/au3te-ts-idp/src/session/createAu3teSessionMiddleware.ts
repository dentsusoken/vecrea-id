import type { SessionSnapshotStore } from '@vecrea/au3te-ts-server/session';
import { ApiClientImpl } from '@vecrea/au3te-ts-server/api';
import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import {
  createAu3teHandlers,
  type Au3teHonoEnv,
} from '../composition/createAu3teHandlers';
import { createServerDeps } from '../composition/createServerDeps';
import { readAu3teApiClientConfig } from '../config/readAu3teApiClientConfig';
import { createKeyedAu3teSession } from './createAu3teSession';

/** 既定のブラウザセッション Cookie 名（Dynamo 等へ切り替えても同一でよいことが多い） */
export const DEFAULT_AU3TE_SESSION_COOKIE = 'au3te_sid';

export type CreateAu3teSessionMiddlewareOptions = {
  /** Cookie セッションと共有する {@link SessionSnapshotStore}（インメモリまたは DynamoDB 等） */
  sessionStore: SessionSnapshotStore;
  /** Cookie 名。省略時は {@link DEFAULT_AU3TE_SESSION_COOKIE} */
  cookieName?: string;
};

/**
 * Cookie のセッション ID と {@link createKeyedAu3teSession} を結び、
 * リクエストごとに `au3teHandlers` を Context に載せる。
 */
export function createAu3teSessionMiddleware(
  options: CreateAu3teSessionMiddlewareOptions
): MiddlewareHandler<Au3teHonoEnv> {
  const cookieName = options.cookieName ?? DEFAULT_AU3TE_SESSION_COOKIE;
  const { sessionStore } = options;

  return async (c, next) => {
    const existingSid = getCookie(c, cookieName);
    const issuedNewCookie = !existingSid;
    const sessionId = existingSid ?? sessionStore.createSessionId();

    const session = createKeyedAu3teSession(sessionId, sessionStore);

    const apiClient = new ApiClientImpl(readAu3teApiClientConfig(c));

    const serverDeps = createServerDeps(c, {
      session,
      apiClient,
    });

    c.set('au3teHandlers', createAu3teHandlers(serverDeps));

    await next();

    if (issuedNewCookie) {
      setCookie(c, cookieName, sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure:
          c.req.header('x-forwarded-proto') === 'https' ||
          c.req.url.startsWith('https:'),
      });
    }
  };
}
