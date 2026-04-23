/**
 * Delete multiple staging table rows by partition key `id` (partial success allowed).
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

export type DeleteStagingUsersBatchError = {
  id: string;
  message: string;
};

/**
 * One `DeleteItem` per id (same parallelism pattern as {@link importUsersCsvToStaging} PutItem fan-out).
 */
export async function deleteStagingUsersBatch(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  ids: string[]
): Promise<{
  requestedCount: number;
  successCount: number;
  failureCount: number;
  errors?: DeleteStagingUsersBatchError[];
}> {
  const outcomes = await Promise.allSettled(
    ids.map((id) =>
      ddb.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { id },
        })
      )
    )
  );

  const errors: DeleteStagingUsersBatchError[] = [];
  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i]!;
    if (outcome.status === 'rejected') {
      const id = ids[i]!;
      const reason = outcome.reason;
      errors.push({
        id,
        message: reason instanceof Error ? reason.message : String(reason),
      });
    }
  }

  const failureCount = errors.length;
  const successCount = ids.length - failureCount;
  return {
    requestedCount: ids.length,
    successCount,
    failureCount,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
