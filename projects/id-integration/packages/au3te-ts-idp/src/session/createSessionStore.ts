import { InMemorySessionStore } from '@vecrea/au3te-ts-server/session';
import type { SessionSnapshotStore } from '@vecrea/au3te-ts-server/session';
import { DynamoDbSessionStore } from '../aws/dynamodb/DynamoDbSessionStore';

/**
 * When set, session snapshots use {@link DynamoDbSessionStore} (24h TTL per write,
 * `ttl` attribute in Unix seconds; enable DynamoDB TTL on that attribute for cleanup).
 * Table: partition key `sessionId` (string), `payload` (JSON string), `ttl` (number).
 */
export const AU3TE_SESSION_DDB_TABLE_ENV = 'AU3TE_SESSION_DDB_TABLE_NAME' as const;

export function createAu3teSessionStore(): SessionSnapshotStore {
  const table = process.env[AU3TE_SESSION_DDB_TABLE_ENV]?.trim();
  if (table) {
    return new DynamoDbSessionStore({ tableName: table });
  }
  return new InMemorySessionStore();
}
