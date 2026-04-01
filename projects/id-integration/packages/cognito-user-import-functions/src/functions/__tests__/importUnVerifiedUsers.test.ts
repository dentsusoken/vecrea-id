import type { Callback, Context, SQSEvent } from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  InvalidPasswordException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../importUnVerifiedUsers';

const emptyMetadata = {};

const cognitoMock = mockClient(CognitoIdentityProviderClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

const USER_POOL_ID = 'ap-northeast-1_TestPool';
const TABLE_NAME = 'test-ddb-table';

/** Minimal body satisfying `cognitoImportDataSchema` (unverified path: no verified flags). */
function userBody(username: string, email: string) {
  return {
    'cognito:username': username,
    email,
    email_verified: 'false',
  };
}

function sqsRecord(body: Record<string, string>): SQSEvent['Records'][number] {
  return {
    messageId: 'msg-id',
    receiptHandle: 'receipt',
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '0',
      SenderId: 'sender',
      ApproximateFirstReceiveTimestamp: '0',
    },
    messageAttributes: {},
    md5OfBody: 'md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:ap-northeast-1:123456789012:q',
    awsRegion: 'ap-northeast-1',
  };
}

const noopCallback = (() => {}) as Callback<void>;
const emptyContext = {} as Context;

beforeEach(() => {
  vi.stubEnv('COGNITO_USER_POOL_ID', USER_POOL_ID);
  vi.stubEnv('DDB_TABLE', TABLE_NAME);

  cognitoMock.reset();
  ddbMock.reset();

  cognitoMock.on(AdminGetUserCommand).resolves({ Username: 'existing' });
  cognitoMock.on(AdminCreateUserCommand).resolves({ User: {} });
  ddbMock.on(UpdateCommand).resolves({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  cognitoMock.reset();
  ddbMock.reset();
});

async function invoke(event: SQSEvent) {
  return handler(event, emptyContext, noopCallback);
}

describe('importUnVerifiedUsers handler', () => {
  it('throws when COGNITO_USER_POOL_ID is not set', async () => {
    vi.stubEnv('COGNITO_USER_POOL_ID', '');

    await expect(
      invoke({ Records: [sqsRecord(userBody('u1', 'u1@example.com'))] })
    ).rejects.toThrow('COGNITO_USER_POOL_ID environment variable is not set');
  });

  it('throws when DDB_TABLE is not set', async () => {
    vi.stubEnv('DDB_TABLE', '');

    await expect(
      invoke({ Records: [sqsRecord(userBody('u1', 'u1@example.com'))] })
    ).rejects.toThrow('DDB_TABLE environment variable is not set');
  });

  it('when user already exists, marks imported only (no AdminCreateUser)', async () => {
    await expect(
      invoke({ Records: [sqsRecord(userBody('existing-user', 'e@example.com'))] })
    ).resolves.toBeUndefined();

    expect(cognitoMock).toHaveReceivedCommandTimes(AdminGetUserCommand, 1);
    expect(cognitoMock).toHaveReceivedCommandWith(AdminGetUserCommand, {
      UserPoolId: USER_POOL_ID,
      Username: 'existing-user',
    });
    expect(cognitoMock).toHaveReceivedCommandTimes(AdminCreateUserCommand, 0);

    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: TABLE_NAME,
      Key: { id: 'existing-user' },
      UpdateExpression: 'SET imported = :imported',
      ExpressionAttributeValues: { ':imported': true },
    });
  });

  it('when user missing, AdminCreateUser without TemporaryPassword then marks imported', async () => {
    cognitoMock.on(AdminGetUserCommand).rejects(
      new UserNotFoundException({
        message: 'User does not exist.',
        $metadata: emptyMetadata,
      })
    );

    await expect(
      invoke({ Records: [sqsRecord(userBody('new-user', 'new@example.com'))] })
    ).resolves.toBeUndefined();

    expect(cognitoMock).toHaveReceivedCommandTimes(AdminGetUserCommand, 1);
    expect(cognitoMock).toHaveReceivedCommandTimes(AdminCreateUserCommand, 1);

    expect(cognitoMock).toHaveReceivedCommandWith(AdminCreateUserCommand, {
      UserPoolId: USER_POOL_ID,
      Username: 'new-user',
      DesiredDeliveryMediums: ['EMAIL'],
    });

    const createCalls = cognitoMock.commandCalls(AdminCreateUserCommand);
    expect(createCalls[0]?.args[0].input).not.toHaveProperty('TemporaryPassword');

    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: TABLE_NAME,
      Key: { id: 'new-user' },
      UpdateExpression: 'SET imported = :imported',
      ExpressionAttributeValues: { ':imported': true },
    });
  });

  it('on AdminCreateUser failure, writes error fields to staging item', async () => {
    cognitoMock.on(AdminGetUserCommand).rejects(
      new UserNotFoundException({
        message: 'User does not exist.',
        $metadata: emptyMetadata,
      })
    );
    cognitoMock.on(AdminCreateUserCommand).rejects(
      new InvalidPasswordException({
        message: 'Password did not conform',
        $metadata: emptyMetadata,
      })
    );

    await expect(
      invoke({ Records: [sqsRecord(userBody('bad', 'bad@example.com'))] })
    ).resolves.toBeUndefined();

    expect(cognitoMock).toHaveReceivedCommandTimes(AdminCreateUserCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: TABLE_NAME,
      Key: { id: 'bad' },
      UpdateExpression: 'SET #err = :errorVal, #errMsg = :errorMessageVal',
      ExpressionAttributeNames: {
        '#err': 'error',
        '#errMsg': 'errorMessage',
      },
      ExpressionAttributeValues: {
        ':errorVal': 'InvalidPasswordException',
        ':errorMessageVal': 'Password did not conform',
      },
    });
  });

  it('rethrows when AdminGetUser fails with a non–UserNotFound error', async () => {
    cognitoMock.on(AdminGetUserCommand).rejects(new Error('throttled'));

    await expect(
      invoke({ Records: [sqsRecord(userBody('u1', 'u1@example.com'))] })
    ).rejects.toThrow('throttled');

    expect(cognitoMock).toHaveReceivedCommandTimes(AdminCreateUserCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('processes multiple SQS records in parallel', async () => {
    cognitoMock.on(AdminGetUserCommand).rejects(
      new UserNotFoundException({
        message: 'User does not exist.',
        $metadata: emptyMetadata,
      })
    );

    await expect(
      invoke({
        Records: [
          sqsRecord(userBody('a', 'a@example.com')),
          sqsRecord(userBody('b', 'b@example.com')),
        ],
      })
    ).resolves.toBeUndefined();

    expect(cognitoMock).toHaveReceivedCommandTimes(AdminGetUserCommand, 2);
    expect(cognitoMock).toHaveReceivedCommandTimes(AdminCreateUserCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
  });
});
