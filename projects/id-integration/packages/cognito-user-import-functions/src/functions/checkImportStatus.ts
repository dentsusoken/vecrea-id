/**
 * Lambda handler that reads Cognito user-import job status and, on success, marks matching
 * DynamoDB staging rows as imported.
 */

import {
  CognitoIdentityProviderClient,
  DescribeUserImportJobCommand,
  UserImportJobType,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Handler } from 'aws-lambda';

/** Lambda event: staging table, pool id, and the Cognito import job to describe. */
interface EventInput {
  /** DynamoDB staging table (same shape as `parseUserInfoCsv` items). */
  DDB_TABLE: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_USER_IMPORT_JOB_ID: string;
}

/**
 * Logs for CloudWatch, then rethrows so Lambda marks the invocation as failed.
 * @param context Step label used in the log prefix.
 * @param error Original error to log and throw.
 */
function logErrorAndRethrow(context: string, error: unknown): never {
  console.error(`[checkImportStatus] ${context}`, error);
  throw error;
}

/**
 * Fetches the current Cognito user-import job record.
 * @throws If the job is missing from the describe response or on SDK errors (logged, then rethrown).
 */
async function describeUserImportJob(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  jobId: string
): Promise<UserImportJobType> {
  const command = new DescribeUserImportJobCommand({
    JobId: jobId,
    UserPoolId: userPoolId,
  });

  try {
    const { UserImportJob } = await cognitoClient.send(command);

    if (!UserImportJob) {
      throw new Error('Cognito user import job does not exist.');
    }

    return UserImportJob;
  } catch (e) {
    logErrorAndRethrow('describeUserImportJob', e);
  }
}

/** Normalized outcome returned by the handler (kept for downstream state machines). */
type ImportCheckOutcome = 'Succeeded' | 'Failed' | 'Continute';

/**
 * Maps Cognito `UserImportJob` status to a coarse outcome for the handler return value.
 * Note: `Continute` spelling is preserved for backward compatibility.
 */
function importJobOutcome(
  status: UserImportJobType['Status'] | undefined
): ImportCheckOutcome {
  switch (status) {
    case 'Succeeded':
      return 'Succeeded';
    case 'Expired':
    case 'Failed':
    case 'Stopped':
      return 'Failed';
    default:
      return 'Continute';
  }
}

/** Same scan filter as `importVerifiedUsers`: verified staging rows not yet marked imported. */
const SCAN_VERIFIED_NOT_IMPORTED = {
  FilterExpression: 'verified = :verified AND imported = :imported',
  ExpressionAttributeValues: { ':verified': true, ':imported': false },
} as const;

function scanVerifiedPendingImports(tableName: string) {
  return new ScanCommand({
    TableName: tableName,
    ...SCAN_VERIFIED_NOT_IMPORTED,
  });
}

/**
 * Loads staging items that are still eligible for post-import bookkeeping (verified, not imported).
 * @throws On DynamoDB errors (logged, then rethrown).
 */
async function loadVerifiedPendingItems(
  ddbClient: DynamoDBDocumentClient,
  table: string
): Promise<Record<string, unknown>[]> {
  try {
    const { Items } = await ddbClient.send(scanVerifiedPendingImports(table));
    return Items ?? [];
  } catch (e) {
    logErrorAndRethrow('loadVerifiedPendingItems', e);
  }
}

/**
 * Sets `imported` to true for each staging row (partition key `id` from the prior pipeline).
 */
async function markStagingRowsImported(
  ddbClient: DynamoDBDocumentClient,
  table: string,
  items: Record<string, unknown>[]
): Promise<void> {
  await Promise.all(
    items.map((item) => {
      const id = item['id'];
      if (id === undefined || id === null) {
        return Promise.resolve();
      }
      return ddbClient.send(
        new UpdateCommand({
          TableName: table,
          Key: { id },
          UpdateExpression: 'SET imported = :imported',
          ExpressionAttributeValues: { ':imported': true },
        })
      );
    })
  );
}

/**
 * Describes the import job; on `Succeeded`, marks still-pending verified staging rows as imported.
 * @returns `Succeeded`, `Failed`, or `Continute` (legacy spelling while the job is in progress).
 */
export const handler: Handler<EventInput, ImportCheckOutcome> = async (event) => {
  const cognitoClient = new CognitoIdentityProviderClient();
  const userImportJob = await describeUserImportJob(
    cognitoClient,
    event.COGNITO_USER_POOL_ID,
    event.COGNITO_USER_IMPORT_JOB_ID
  );

  const outcome = importJobOutcome(userImportJob.Status);

  if (outcome === 'Succeeded') {
    const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
    const items = await loadVerifiedPendingItems(ddbClient, event.DDB_TABLE);
    if (items.length > 0) {
      await markStagingRowsImported(ddbClient, event.DDB_TABLE, items);
    }
  }

  return outcome;
};
