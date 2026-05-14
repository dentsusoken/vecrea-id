/**
 * Step Functions task: scans DynamoDB for verified, not-yet-imported staging users, builds a Cognito bulk-import CSV,
 * uploads to the pre-signed URL, and starts the user-import job. If there are no such rows, returns
 * {@link SKIP_USER_IMPORT_JOB_CHECK_JOB_ID} as `jobId` so `checkImportStatus` can skip Cognito polling.
 */

import {
  CognitoIdentityProviderClient,
  CreateUserImportJobCommand,
  StartUserImportJobCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Handler } from 'aws-lambda';
import papa from 'papaparse';
import { SKIP_USER_IMPORT_JOB_CHECK_JOB_ID } from '../constants/importVerifiedUserImportJob';
import { cognitoImportDataSchema } from '../schemas';
import type { CognitoImportData } from '../schemas';

/** Lambda event: DynamoDB table, Cognito pool, job naming, and CloudWatch Logs role for import diagnostics. */
interface EventInput {
  /** DynamoDB table containing user staging items (`verified` / `imported` / `data`). */
  DDB_TABLE: string;
  /** Target Cognito user pool ID. */
  COGNITO_USER_POOL_ID: string;
  /** Prefix for `JobName`; a timestamp suffix is appended. */
  COGNITO_USER_IMPORT_JOB_BASE_NAME: string;
  /** IAM role ARN Cognito uses to publish user import logs to CloudWatch. */
  CLOUD_WATCH_LOG_ROLE_ARN: string;
}

/**
 * Payload returned for Step Functions / `checkImportStatus`.
 * When there are no verified users to import, `jobId` is {@link SKIP_USER_IMPORT_JOB_CHECK_JOB_ID} (no Cognito job created).
 */
export type ImportVerifiedUsersResult = { jobId: string };

/**
 * Writes a structured log line, then rethrows so the Lambda invocation fails.
 * @param context Step label included in the log prefix (e.g. `loadVerifiedUsersForImport`).
 * @param error Original error or value to log and throw.
 */
function logErrorAndRethrow(context: string, error: unknown): never {
  console.error(`[importVerifiedUsers] ${context}`, error);
  throw error;
}

/** DynamoDB scan filter: top-level `verified` is true and `imported` is false (matches staging item shape). */
const SCAN_VERIFIED_NOT_IMPORTED = {
  FilterExpression: 'verified = :verified AND imported = :imported',
  ExpressionAttributeValues: { ':verified': true, ':imported': false },
} as const;

/**
 * Builds a `ScanCommand` for users ready to be exported to a Cognito import job.
 * @param tableName DynamoDB table name.
 * @returns Configured `ScanCommand` (filter: verified and not imported).
 */
function scanVerifiedPendingImports(tableName: string) {
  return new ScanCommand({
    TableName: tableName,
    ...SCAN_VERIFIED_NOT_IMPORTED,
  });
}

/**
 * Scans the staging table and parses each item's `data` attribute with `cognitoImportDataSchema`.
 * @param ddbClient Document client used to run the scan.
 * @param table DynamoDB table name.
 * @returns Validated `CognitoImportData[]` (may be empty).
 * @throws On DynamoDB or schema errors (logged, then rethrown).
 */
async function loadVerifiedUsersForImport(
  ddbClient: DynamoDBDocumentClient,
  table: string
): Promise<CognitoImportData[]> {
  try {
    const { Items } = await ddbClient.send(scanVerifiedPendingImports(table));
    const rows = Items?.map((item) => item['data']);
    return cognitoImportDataSchema.array().parse(rows);
  } catch (e) {
    logErrorAndRethrow('loadVerifiedUsersForImport', e);
  }
}

/**
 * Serializes validated users to CSV text suitable for Cognito `CreateUserImportJob`.
 * @param users Rows to include in the import file.
 * @returns CSV string (including header row when rows are non-empty, per PapaParse behavior).
 */
function cognitoImportCsvFromUsers(users: CognitoImportData[]) {
  return papa.unparse<CognitoImportData>(users);
}

/**
 * Builds a unique import job name from a base prefix and the current time (`:` replaced in ISO timestamp).
 * @param baseName `COGNITO_USER_IMPORT_JOB_BASE_NAME` from the event.
 */
function importJobName(baseName: string) {
  return `${baseName}-${new Date().toISOString().replace(/:/g, '-')}`;
}

/**
 * Calls `CreateUserImportJob` and returns the job id and S3 pre-signed upload URL.
 * @param cognitoClient AWS SDK client for Cognito IdP.
 * @param userPoolId User pool that will receive imported users.
 * @param jobName Unique job name (see `importJobName`).
 * @param cloudWatchLogsRoleArn Role for import log delivery.
 * @returns Cognito job id and pre-signed PUT URL for the import CSV.
 * @throws If the API response omits `UserImportJob`, `JobId`, or `PreSignedUrl`, or on SDK errors (logged, then rethrown).
 */
async function createUploadableImportJob(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  jobName: string,
  cloudWatchLogsRoleArn: string
): Promise<{ jobId: string; uploadUrl: string }> {
  const command = new CreateUserImportJobCommand({
    CloudWatchLogsRoleArn: cloudWatchLogsRoleArn,
    JobName: jobName,
    UserPoolId: userPoolId,
  });

  try {
    const { UserImportJob } = await cognitoClient.send(command);

    if (!UserImportJob) {
      throw new Error('Failed to Create Cognito User Import Job.');
    }

    const { JobId, PreSignedUrl } = UserImportJob;

    if (!JobId) {
      throw new Error('Failed to retrieve Cognito User Import JobId.');
    }
    if (!PreSignedUrl) {
      throw new Error(
        'Failed to retrieve Cognito User Import Job PreSignedUrl.'
      );
    }

    return { jobId: JobId, uploadUrl: PreSignedUrl };
  } catch (e) {
    logErrorAndRethrow('createUploadableImportJob', e);
  }
}

/** Headers required when uploading the import CSV to the pre-signed URL (SSE-KMS). */
const PRESIGNED_PUT_HEADERS = {
  'Content-Type': 'text/csv',
  'x-amz-server-side-encryption': 'aws:kms',
} as const;

/**
 * PUTs the CSV body to Cognito's pre-signed S3 URL.
 * @param url `PreSignedUrl` from `CreateUserImportJob`.
 * @param csv Full CSV payload.
 * @throws On network errors or non-2xx responses (logged, then rethrown).
 */
async function putCsvToPresignedUrl(url: string, csv: string) {
  try {
    const response = await fetch(url, {
      body: csv,
      method: 'PUT',
      headers: PRESIGNED_PUT_HEADERS,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CSV upload failed: ${response.status} ${text}`);
    }
  } catch (e) {
    logErrorAndRethrow('putCsvToPresignedUrl', e);
  }
}

/**
 * Starts processing for an import job after the CSV has been uploaded.
 * @param cognitoClient AWS SDK client for Cognito IdP.
 * @param userPoolId User pool ID.
 * @param jobId Id returned from `CreateUserImportJob`.
 * @throws On SDK errors (logged, then rethrown).
 */
async function startImportJob(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  jobId: string
) {
  try {
    await cognitoClient.send(
      new StartUserImportJobCommand({
        UserPoolId: userPoolId,
        JobId: jobId,
      })
    );
  } catch (e) {
    logErrorAndRethrow('startImportJob', e);
  }
}

/**
 * Orchestrates scan → CSV → create job → upload → start import for verified staging users.
 *
 * @param event - `DDB_TABLE`, `COGNITO_USER_POOL_ID`, `COGNITO_USER_IMPORT_JOB_BASE_NAME`, `CLOUD_WATCH_LOG_ROLE_ARN`.
 * @returns `{ jobId }` from `CreateUserImportJob` after `StartUserImportJob`, or {@link SKIP_USER_IMPORT_JOB_CHECK_JOB_ID} when there is nothing to import.
 * @throws On DynamoDB/Cognito/network errors during load, job creation, CSV upload, or start (after `console.error`).
 */
export const handler: Handler<EventInput, ImportVerifiedUsersResult> = async (event) => {
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
  const users = await loadVerifiedUsersForImport(ddbClient, event.DDB_TABLE);

  if (users.length === 0) {
    return { jobId: SKIP_USER_IMPORT_JOB_CHECK_JOB_ID };
  }

  const csv = cognitoImportCsvFromUsers(users);

  const cognitoClient = new CognitoIdentityProviderClient();
  const { jobId, uploadUrl } = await createUploadableImportJob(
    cognitoClient,
    event.COGNITO_USER_POOL_ID,
    importJobName(event.COGNITO_USER_IMPORT_JOB_BASE_NAME),
    event.CLOUD_WATCH_LOG_ROLE_ARN
  );

  await putCsvToPresignedUrl(uploadUrl, csv);
  await startImportJob(cognitoClient, event.COGNITO_USER_POOL_ID, jobId);

  return { jobId };
};
