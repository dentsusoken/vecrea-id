import {
  InMemorySession,
  defaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';

/** 単一プロセス内の開発・検証用。本番の永続化は {@link createServerDeps} の `session` で差し替える */
export function createInMemoryAu3teSession() {
  return new InMemorySession(defaultSessionSchemas);
}
