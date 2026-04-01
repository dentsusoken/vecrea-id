import type { Callback, Context } from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import {
  CognitoIdentityProviderClient,
  CreateUserImportJobCommand,
  StartUserImportJobCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handler,
  type ImportVerifiedUsersResult,
} from '../importVerifiedUsers';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

const baseEvent = {
  DDB_TABLE: 'test-ddb-table',
  COGNITO_USER_POOL_ID: 'ap-northeast-1_TestPool',
  COGNITO_USER_IMPORT_JOB_BASE_NAME: 'verified-users-import',
  CLOUD_WATCH_LOG_ROLE_ARN: 'arn:aws:iam::123456789012:role/CognitoIdpCognitoToCWLogs',
};

const mockJobId = 'import-job-id';

const noopCallback = (() => {}) as Callback<ImportVerifiedUsersResult>;
const emptyContext = {} as Context;

/** Minimal `data` payload that satisfies `cognitoImportDataSchema` (email required when `email_verified` is true). */
function verifiedUserItem(username: string, email: string) {
  return {
    data: {
      'cognito:username': username,
      email,
      email_verified: 'true',
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-06-01T12:34:56.789Z'));

  ddbMock.reset();
  cognitoMock.reset();

  ddbMock.on(ScanCommand).resolves({
    Items: [verifiedUserItem('user-a', 'a@example.com')],
  });

  cognitoMock.on(CreateUserImportJobCommand).resolves({
    UserImportJob: {
      JobId: mockJobId,
      PreSignedUrl: 'https://s3.example.com/presigned-put',
    },
  });

  cognitoMock.on(StartUserImportJobCommand).resolves({});

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  ddbMock.reset();
  cognitoMock.reset();
});

async function invoke(
  overrides: Partial<typeof baseEvent> = {}
) {
  return handler(
    { ...baseEvent, ...overrides },
    emptyContext,
    noopCallback
  );
}

describe('importVerifiedUsers handler', () => {
  it('scans verified non-imported users, creates import job, uploads CSV, and starts the job', async () => {
    await expect(invoke()).resolves.toEqual({ jobId: mockJobId });

    expect(ddbMock).toHaveReceivedCommandWith(ScanCommand, {
      TableName: baseEvent.DDB_TABLE,
      FilterExpression: 'verified = :verified AND imported = :imported',
      ExpressionAttributeValues: { ':verified': true, ':imported': false },
    });

    expect(cognitoMock).toHaveReceivedCommandWith(CreateUserImportJobCommand, {
      UserPoolId: baseEvent.COGNITO_USER_POOL_ID,
      CloudWatchLogsRoleArn: baseEvent.CLOUD_WATCH_LOG_ROLE_ARN,
      JobName: 'verified-users-import-2025-06-01T12-34-56.789Z',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://s3.example.com/presigned-put',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'text/csv',
          'x-amz-server-side-encryption': 'aws:kms',
        },
      })
    );

    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = fetchCall?.[1]?.body as string;
    expect(body).toContain('user-a');
    expect(body).toContain('a@example.com');

    expect(cognitoMock).toHaveReceivedCommandWith(StartUserImportJobCommand, {
      UserPoolId: baseEvent.COGNITO_USER_POOL_ID,
      JobId: mockJobId,
    });
  });

  it('still runs create/upload/start when no users are returned', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    await expect(invoke()).resolves.toEqual({ jobId: mockJobId });

    expect(cognitoMock).toHaveReceivedCommandTimes(CreateUserImportJobCommand, 1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(cognitoMock).toHaveReceivedCommandTimes(StartUserImportJobCommand, 1);
  });

  it('throws when CSV upload returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'AccessDenied',
      })
    );

    await expect(invoke()).rejects.toThrow();
  });

  it('throws when CreateUserImportJob returns no UserImportJob', async () => {
    cognitoMock.on(CreateUserImportJobCommand).resolves({});

    await expect(invoke()).rejects.toThrow();
  });
});
