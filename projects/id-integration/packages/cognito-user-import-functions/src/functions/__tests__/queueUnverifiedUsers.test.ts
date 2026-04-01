import type { Callback, Context } from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handler,
  type QueueUnverifiedUsersResult,
} from '../queueUnverifiedUsers';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

const baseEvent = {
  DDB_TABLE: 'test-ddb-table',
  SQS_QUEUE_URL: 'https://sqs.ap-northeast-1.amazonaws.com/123456789012/unverified-import',
};

function unverifiedStagingItem(id: string) {
  return {
    id,
    verified: false,
    imported: false,
    data: { 'cognito:username': id, email: `${id}@example.com` },
  };
}

const noopCallback = (() => {}) as Callback<QueueUnverifiedUsersResult>;
const emptyContext = {} as Context;

beforeEach(() => {
  ddbMock.reset();
  sqsMock.reset();

  ddbMock.on(ScanCommand).resolves({
    Items: [unverifiedStagingItem('user-a')],
  });

  sqsMock.on(SendMessageCommand).resolves({ MessageId: 'msg-1' });
});

afterEach(() => {
  vi.restoreAllMocks();
  ddbMock.reset();
  sqsMock.reset();
});

async function invoke(overrides: Partial<typeof baseEvent> = {}) {
  return handler({ ...baseEvent, ...overrides }, emptyContext, noopCallback);
}

describe('queueUnverifiedUsers handler', () => {
  it('scans unverified non-imported users and sends one SQS message per item (Item.data only)', async () => {
    const item = unverifiedStagingItem('user-a');

    await expect(invoke()).resolves.toEqual({ queuedCount: 1 });

    expect(ddbMock).toHaveReceivedCommandWith(ScanCommand, {
      TableName: baseEvent.DDB_TABLE,
      FilterExpression: 'verified = :verified AND imported = :imported',
      ExpressionAttributeValues: { ':verified': false, ':imported': false },
    });

    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      QueueUrl: baseEvent.SQS_QUEUE_URL,
      MessageBody: JSON.stringify(item.data),
    });
  });

  it('returns queuedCount 0 and does not call SQS when the scan returns no items', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    await expect(invoke()).resolves.toEqual({ queuedCount: 0 });

    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 0);
  });

  it('paginates Scan until LastEvaluatedKey is absent and enqueues all pages', async () => {
    const key = { id: 'user-a' };
    const item1 = unverifiedStagingItem('user-a');
    const item2 = unverifiedStagingItem('user-b');

    ddbMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: [item1],
        LastEvaluatedKey: key,
      })
      .resolvesOnce({
        Items: [item2],
      });

    await expect(invoke()).resolves.toEqual({ queuedCount: 2 });

    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 2);

    expect(ddbMock).toHaveReceivedNthCommandWith(ScanCommand, 1, {
      TableName: baseEvent.DDB_TABLE,
      FilterExpression: 'verified = :verified AND imported = :imported',
      ExpressionAttributeValues: { ':verified': false, ':imported': false },
    });

    expect(ddbMock).toHaveReceivedNthCommandWith(ScanCommand, 2, {
      TableName: baseEvent.DDB_TABLE,
      ExclusiveStartKey: key,
      FilterExpression: 'verified = :verified AND imported = :imported',
      ExpressionAttributeValues: { ':verified': false, ':imported': false },
    });

    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 2);
  });

  it('rethrows when DynamoDB Scan fails', async () => {
    const err = new Error('ddb unavailable');
    ddbMock.on(ScanCommand).rejects(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invoke()).rejects.toThrow(err);

    expect(spy).toHaveBeenCalledWith(
      '[queueUnverifiedUsers] loadUnverifiedPendingItems',
      err
    );
  });

  it('rethrows when a staging item omits data', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 'broken', verified: false, imported: false }],
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invoke()).rejects.toThrow(
      'Staging item missing required "data"'
    );

    expect(spy).toHaveBeenCalledWith(
      '[queueUnverifiedUsers] messageBodyFromStagingItem',
      expect.any(Error)
    );
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 0);
  });

  it('throws a JSON aggregate error when any SQS send fails', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [unverifiedStagingItem('u1'), unverifiedStagingItem('u2')],
    });

    sqsMock
      .on(SendMessageCommand)
      .resolvesOnce({ MessageId: 'ok' })
      .rejectsOnce(new Error('throttled'));

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invoke()).rejects.toThrow();

    expect(spy).toHaveBeenCalledWith(
      '[queueUnverifiedUsers] sendMessagesToQueue: SQS send failures',
      expect.any(Array)
    );
  });
});
