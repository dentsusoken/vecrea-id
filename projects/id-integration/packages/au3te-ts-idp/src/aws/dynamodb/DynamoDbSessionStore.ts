import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  CreateSessionId,
  SessionSchemas,
  SessionSnapshotStore,
  StoredSessionData,
} from '@vecrea/au3te-ts-server/session';
import { defaultCreateSessionId } from '@vecrea/au3te-ts-server/session';

const DEFAULT_TTL_SECONDS = 86_400; // 24 hours

export type DynamoDbSessionStoreOptions = {
  tableName: string;
  /** Partition key attribute (default: `sessionId`) */
  partitionKey?: string;
  /** Attribute storing JSON-encoded {@link StoredSessionData} (default: `payload`) */
  payloadAttribute?: string;
  /**
   * Unix epoch seconds attribute for expiry (default: `ttl`). Each write sets
   * `now + ttlSeconds`. Reads return no data and delete the item when this time
   * is in the past. Enable DynamoDB TTL on this attribute for automatic cleanup.
   */
  ttlAttribute?: string;
  /** Seconds until session expires after each write (default: 24 hours). */
  ttlSeconds?: number;
  documentClient?: DynamoDBDocumentClient;
  createSessionId?: CreateSessionId;
};

/**
 * DynamoDB-backed {@link SessionSnapshotStore}.
 *
 * **Table:** partition key = `partitionKey` (string). One item per session:
 * `{ [partitionKey], [payloadAttribute], [ttlAttribute] }`.
 * Empty snapshots remove the item (same as {@link InMemorySessionStore}).
 */
export class DynamoDbSessionStore implements SessionSnapshotStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly pk: string;
  private readonly payloadAttr: string;
  private readonly ttlAttr: string;
  private readonly ttlSeconds: number;
  readonly #createSessionId: CreateSessionId;

  constructor(options: DynamoDbSessionStoreOptions) {
    const {
      tableName,
      partitionKey = 'sessionId',
      payloadAttribute = 'payload',
      ttlAttribute = 'ttl',
      ttlSeconds = DEFAULT_TTL_SECONDS,
      documentClient,
    } = options;
    this.tableName = tableName;
    this.pk = partitionKey;
    this.payloadAttr = payloadAttribute;
    this.ttlAttr = ttlAttribute;
    this.ttlSeconds = ttlSeconds;
    this.#createSessionId = options.createSessionId ?? defaultCreateSessionId;
    this.doc =
      documentClient ??
      DynamoDBDocumentClient.from(new DynamoDBClient({}), {
        marshallOptions: { removeUndefinedValues: true },
      });
  }

  createSessionId(): string {
    return this.#createSessionId();
  }

  async read(
    sessionId: string
  ): Promise<StoredSessionData<SessionSchemas> | undefined> {
    const out = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { [this.pk]: sessionId },
        ConsistentRead: true,
      })
    );
    const item = out.Item;
    if (item == null) {
      return undefined;
    }
    const deadline = item[this.ttlAttr];
    if (typeof deadline === 'number' && deadline < unixSecondsNow()) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { [this.pk]: sessionId },
        })
      );
      return undefined;
    }
    const raw = item[this.payloadAttr];
    if (raw == null) {
      return undefined;
    }
    if (typeof raw !== 'string') {
      throw new Error(
        `DynamoDB session item ${sessionId}: ${this.payloadAttr} must be a string (JSON).`
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        `DynamoDB session item ${sessionId}: invalid JSON in ${this.payloadAttr}.`
      );
    }
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        `DynamoDB session item ${sessionId}: payload must be a JSON object.`
      );
    }
    return parsed as StoredSessionData<SessionSchemas>;
  }

  async write(
    sessionId: string,
    data: StoredSessionData<SessionSchemas>
  ): Promise<void> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { [this.pk]: sessionId },
        })
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          [this.pk]: sessionId,
          [this.payloadAttr]: JSON.stringify(data),
          [this.ttlAttr]: unixSecondsNow() + this.ttlSeconds,
        },
      })
    );
  }
}

function unixSecondsNow(): number {
  return Math.floor(Date.now() / 1000);
}
