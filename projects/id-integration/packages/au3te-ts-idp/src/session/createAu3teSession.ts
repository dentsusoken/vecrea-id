import {
  KeyedSession,
  defaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';
import type { SessionSnapshotStore } from '@vecrea/au3te-ts-server/session';

/**
 * 単一インスタンス内だけで完結するセッション（`sessionId` は空文字）。
 * ユニットテストや {@link createServerDeps} のデフォルト向け。
 */
export function createEphemeralAu3teSession() {
  return new KeyedSession(defaultSessionSchemas);
}

/** 共有 {@link SessionSnapshotStore} とセッション ID でキー化したセッション。 */
export function createKeyedAu3teSession(
  sessionId: string,
  store: SessionSnapshotStore
) {
  return new KeyedSession(defaultSessionSchemas, sessionId, store);
}
