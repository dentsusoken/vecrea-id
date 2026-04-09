import {
  KeyedSession,
  InMemorySessionStore,
  defaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';

/**
 * 単一インスタンス内だけで完結するセッション（`sessionId` は空文字）。
 * ユニットテストや {@link createServerDeps} のデフォルト向け。
 */
export function createEphemeralAu3teSession() {
  return new KeyedSession(defaultSessionSchemas);
}

/** 共有 {@link InMemorySessionStore} とセッション ID でキー化したセッション（開発・検証用）。 */
export function createKeyedAu3teSession(
  sessionId: string,
  store: InMemorySessionStore
) {
  return new KeyedSession(defaultSessionSchemas, sessionId, store);
}
