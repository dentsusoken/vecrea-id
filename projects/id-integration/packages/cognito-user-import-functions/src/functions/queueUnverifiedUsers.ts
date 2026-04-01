/**
 * Lambda handler that scans DynamoDB for unverified, not-yet-imported staging users and
 * enqueues each item as one SQS message (full DynamoDB item shape in the body).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Handler } from 'aws-lambda';

/** Lambda event: staging table and target queue URL. */
interface EventInput {
  /** DynamoDB table containing user staging items (`verified` / `imported` / `data`). */
  DDB_TABLE: string;
  /** SQS queue URL for messages consumed by the unverified-user import worker. */
  SQS_QUEUE_URL: string;
}

/** Result returned after enqueue attempts (for callers / Step Functions). */
export type QueueUnverifiedUsersResult = { queuedCount: number };

/**
 * Writes a structured log line, then rethrows so the Lambda invocation fails.
 * @param context Step label included in the log prefix.
 * @param error Original error or value to log and throw.
 */
function logErrorAndRethrow(context: string, error: unknown): never {
  console.error(`[queueUnverifiedUsers] ${context}`, error);
  throw error;
}

/** DynamoDB scan filter: `verified` is false and `imported` is false (staging item shape). */
const SCAN_UNVERIFIED_NOT_IMPORTED = {
  FilterExpression: 'verified = :verified AND imported = :imported',
  ExpressionAttributeValues: { ':verified': false, ':imported': false },
} as const;

/**
 * Scans the staging table for all pages (unverified, not imported) and returns raw items.
 * @throws On DynamoDB errors (logged, then rethrown).
 */
async function loadUnverifiedPendingItems(
  ddbClient: DynamoDBDocumentClient,
  table: string
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  try {
    do {
      const command = new ScanCommand({
        TableName: table,
        ...SCAN_UNVERIFIED_NOT_IMPORTED,
        ...(exclusiveStartKey !== undefined
          ? { ExclusiveStartKey: exclusiveStartKey }
          : {}),
      });

      const { Items, LastEvaluatedKey } = await ddbClient.send(command);

      if (Items?.length) {
        items.push(...Items);
      }
      exclusiveStartKey = LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey);
  } catch (e) {
    logErrorAndRethrow('loadUnverifiedPendingItems', e);
  }

  return items;
}

/**
 * Sends one SQS message per staging item (JSON body = full item).
 * @throws If any send fails (failures logged, then thrown as `Error` with JSON message).
 */
async function sendMessagesToQueue(
  sqsClient: SQSClient,
  queueUrl: string,
  stagingItems: Record<string, unknown>[]
): Promise<void> {
  const outcomes = await Promise.allSettled(
    stagingItems.map((item) =>
      sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(item),
        })
      )
    )
  );

  const failures = outcomes.flatMap((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      return [];
    }
    const id = stagingItems[index]?.['id'];
    return [`id:${String(id)} :>> ${outcome.reason}`];
  });

  if (failures.length > 0) {
    console.error(
      '[queueUnverifiedUsers] sendMessagesToQueue: SQS send failures',
      failures
    );
    throw new Error(JSON.stringify(failures, null, 2));
  }
}

/**
 * Scans unverified staging rows and enqueues each as an SQS message.
 * @param event Must include `DDB_TABLE` and `SQS_QUEUE_URL`.
 * @returns `{ queuedCount }` — number of messages successfully sent.
 */
export const handler: Handler<
  EventInput,
  QueueUnverifiedUsersResult
> = async (event) => {
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
  const items = await loadUnverifiedPendingItems(ddbClient, event.DDB_TABLE);

  if (items.length === 0) {
    return { queuedCount: 0 };
  }

  const sqsClient = new SQSClient({});
  await sendMessagesToQueue(sqsClient, event.SQS_QUEUE_URL, items);

  return { queuedCount: items.length };
};
