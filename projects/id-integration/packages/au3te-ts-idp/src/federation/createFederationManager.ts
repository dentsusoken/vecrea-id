import type { Context } from 'hono';
import {
  FederationManagerImpl,
  type FederationManager,
} from '@vecrea/au3te-ts-server/federation';
import {
  readFederationIsDev,
  readFederationRegistry,
} from '../config/readFederationRegistry';

/**
 * 環境変数のレジストリで {@link FederationManagerImpl} を生成する。
 * SAML 2.0 を使う場合は将来 {@link FederationManagerImpl} の `validator` 注入に対応する。
 */
export function createFederationManagerFromEnv(c?: Context): FederationManager {
  return new FederationManagerImpl({
    registry: readFederationRegistry(c),
    isDev: readFederationIsDev(c),
  });
}
