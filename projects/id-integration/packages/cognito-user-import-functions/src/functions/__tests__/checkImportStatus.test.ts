import type { Callback, Context } from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import {
  CognitoIdentityProviderClient,
  DescribeUserImportJobCommand,
  type UserImportJobType,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handler } from '../checkImportStatus';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

const baseEvent = {
  DDB_TABLE: 'test-ddb-table',
  COGNITO_USER_POOL_ID: 'ap-northeast-1_TestPool',
  COGNITO_USER_IMPORT_JOB_ID: 'cognito-import-job-123',
};

type ImportCheckOutcome = 'Succeeded' | 'Failed' | 'Continute';

const noopCallback = (() => {}) as Callback<ImportCheckOutcome>;
const emptyContext = {} as Context;

const SCAN_EXPECTATION = {
  TableName: baseEvent.DDB_TABLE,
  FilterExpression: 'verified = :verified AND imported = :imported',
  ExpressionAttributeValues: { ':verified': true, ':imported': false },
};

function stubDescribeJob(status: UserImportJobType['Status']) {
  cognitoMock.on(DescribeUserImportJobCommand).resolves({
    UserImportJob: {
      JobId: baseEvent.COGNITO_USER_IMPORT_JOB_ID,
      UserPoolId: baseEvent.COGNITO_USER_POOL_ID,
      Status: status,
    },
  });
}

beforeEach(() => {
  ddbMock.reset();
  cognitoMock.reset();

  stubDescribeJob('Pending');

  ddbMock.on(ScanCommand).resolves({
    Items: [
      {
        id: 'user-a',
        data: { 'cognito:username': 'user-a', email: 'a@example.com' },
        verified: true,
        imported: false,
      },
    ],
  });

  ddbMock.on(UpdateCommand).resolves({});
});

afterEach(() => {
  ddbMock.reset();
  cognitoMock.reset();
});

async function invoke(overrides: Partial<typeof baseEvent> = {}) {
  return handler(
    { ...baseEvent, ...overrides },
    emptyContext,
    noopCallback
  );
}

describe('checkImportStatus handler', () => {
  it('returns Succeeded and marks staging rows imported when Cognito job succeeded', async () => {
    stubDescribeJob('Succeeded');

    await expect(invoke()).resolves.toBe('Succeeded');

    expect(cognitoMock).toHaveReceivedCommandWith(DescribeUserImportJobCommand, {
      UserPoolId: baseEvent.COGNITO_USER_POOL_ID,
      JobId: baseEvent.COGNITO_USER_IMPORT_JOB_ID,
    });

    expect(ddbMock).toHaveReceivedCommandWith(ScanCommand, SCAN_EXPECTATION);

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: baseEvent.DDB_TABLE,
      Key: { id: 'user-a' },
      UpdateExpression: 'SET imported = :imported',
      ExpressionAttributeValues: { ':imported': true },
    });
  });

  it('returns Failed and does not touch DynamoDB when Cognito job failed', async () => {
    stubDescribeJob('Failed');

    await expect(invoke()).resolves.toBe('Failed');

    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('returns Continute while Cognito job is still in progress', async () => {
    stubDescribeJob('Pending');

    await expect(invoke()).resolves.toBe('Continute');

    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
  });

  it('maps Expired Cognito status to Failed', async () => {
    stubDescribeJob('Expired');

    await expect(invoke()).resolves.toBe('Failed');

    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
  });

  it('does not send UpdateCommand when scan returns no items', async () => {
    stubDescribeJob('Succeeded');
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    await expect(invoke()).resolves.toBe('Succeeded');

    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('skips UpdateCommand for items missing id', async () => {
    stubDescribeJob('Succeeded');
    ddbMock.on(ScanCommand).resolves({
      Items: [{ data: { 'cognito:username': 'orphan' }, verified: true }],
    });

    await expect(invoke()).resolves.toBe('Succeeded');

    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('updates each scanned row with an id', async () => {
    stubDescribeJob('Succeeded');
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { id: 'u1', verified: true, imported: false },
        { id: 'u2', verified: true, imported: false },
      ],
    });

    await expect(invoke()).resolves.toBe('Succeeded');

    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      Key: { id: 'u1' },
    });
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      Key: { id: 'u2' },
    });
  });

  it('throws when DescribeUserImportJob returns no UserImportJob', async () => {
    cognitoMock.on(DescribeUserImportJobCommand).resolves({});

    await expect(invoke()).rejects.toThrow();
  });
});
