import type {
  Callback,
  Context,
  UserMigrationAuthenticationTriggerEvent,
  UserMigrationForgotPasswordTriggerEvent,
} from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../userMigrationTrigger';

const ddbMock = mockClient(DynamoDBDocumentClient);

const TABLE_NAME = 'test-migration-table';

const noopCallback = (() => {}) as Callback<
  UserMigrationAuthenticationTriggerEvent | UserMigrationForgotPasswordTriggerEvent
>;
const emptyContext = {} as Context;

function migrationAuthEvent(
  username: string,
  password: string
): UserMigrationAuthenticationTriggerEvent {
  return {
    version: '1',
    region: 'ap-northeast-1',
    userPoolId: 'ap-northeast-1_TestPool',
    triggerSource: 'UserMigration_Authentication',
    userName: username,
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'test-client-id',
    },
    request: {
      password,
    },
    response: {
      userAttributes: {},
      desiredDeliveryMediums: [],
    },
  };
}

function migrationForgotPasswordEvent(
  username: string
): UserMigrationForgotPasswordTriggerEvent {
  return {
    version: '1',
    region: 'ap-northeast-1',
    userPoolId: 'ap-northeast-1_TestPool',
    triggerSource: 'UserMigration_ForgotPassword',
    userName: username,
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'test-client-id',
    },
    request: {
      password: '',
    },
    response: {
      userAttributes: {},
      desiredDeliveryMediums: [],
    },
  };
}

/** Minimal `data` payload valid for `cognitoImportDataSchema`. */
function stagingData(username: string, email: string) {
  return {
    'cognito:username': username,
    email,
    email_verified: 'true',
  };
}

beforeEach(() => {
  vi.stubEnv('DDB_TABLE', TABLE_NAME);
  vi.stubEnv('HASH_ALG', '');
  vi.stubEnv('HASH_SALT', '');
  ddbMock.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  ddbMock.reset();
});

async function invoke(
  event:
    | UserMigrationAuthenticationTriggerEvent
    | UserMigrationForgotPasswordTriggerEvent
) {
  return handler(event, emptyContext, noopCallback);
}

describe('userMigrationTrigger handler', () => {
  it('UserMigration_ForgotPassword: returns event unchanged and does not call DynamoDB', async () => {
    const event = migrationForgotPasswordEvent('alice');

    const result = await invoke(event);

    expect(result).toBe(event);
    expect(result.triggerSource).toBe('UserMigration_ForgotPassword');
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 0);
  });

  it('UserMigration_Authentication: loads staging user, sets userAttributes (PLAIN_TEXT password_hash in Item.data)', async () => {
    const password = 'plain-secret';
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: 'alice',
        data: {
          ...stagingData('alice', 'alice@example.com'),
          password_hash: password,
        },
      },
    });

    const event = migrationAuthEvent('alice', password);
    const result = await invoke(event);

    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: TABLE_NAME,
      Key: { id: 'alice' },
    });

    expect(result.response.userAttributes).toEqual({
      email: 'alice@example.com',
      email_verified: 'true',
    });

    expect(result.triggerSource).toBe('UserMigration_Authentication');
  });

  it('throws when DDB_TABLE is not set', async () => {
    vi.stubEnv('DDB_TABLE', '');

    await expect(invoke(migrationAuthEvent('u', 'pw'))).rejects.toThrow(
      'DDB_TABLE environment variable is not set'
    );
  });

  it('throws when HASH_ALG is set to an unknown value', async () => {
    vi.stubEnv('HASH_ALG', 'NOT_AN_ALG');

    await expect(invoke(migrationAuthEvent('u', 'pw'))).rejects.toThrow(
      'HASH_ALG environment variable must be one of:'
    );
  });

  it('throws User not found when DynamoDB returns no item', async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(invoke(migrationAuthEvent('missing', 'pw'))).rejects.toThrow(
      'User not found.'
    );
  });

  it('throws Invalid Password when password_hash is missing', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: 'alice',
        data: stagingData('alice', 'a@b.com'),
      },
    });

    await expect(invoke(migrationAuthEvent('alice', 'pw'))).rejects.toThrow(
      'Invalid Password.'
    );
  });

  it('throws Invalid Password when verifyPasswordHash fails', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: 'alice',
        data: {
          ...stagingData('alice', 'a@b.com'),
          password_hash: 'stored-hash',
        },
      },
    });

    await expect(
      invoke(migrationAuthEvent('alice', 'wrong-password'))
    ).rejects.toThrow('Invalid Password.');
  });

  it('logs and rethrows on DynamoDB GetCommand failure', async () => {
    const err = new Error('DynamoDB throttled');
    ddbMock.on(GetCommand).rejects(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invoke(migrationAuthEvent('alice', 'pw'))).rejects.toThrow(
      'DynamoDB throttled'
    );

    expect(spy).toHaveBeenCalledWith(
      '[userMigrationTrigger] getStagingItemByUsername',
      err
    );

    spy.mockRestore();
  });
});
