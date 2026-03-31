import type { Callback, Context } from 'aws-lambda';
import 'aws-sdk-client-mock-vitest/extend';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../parseUserInfoCsv';

const ddbMock = mockClient(DynamoDBDocumentClient);

const TABLE = 'test-ddb-table';

const CSV_HEADER = [
  'cognito:username',
  'email',
  'email_verified',
  'phone_number',
  'phone_number_verified',
  'name',
].join(',');

beforeEach(() => {
  ddbMock.reset();
  ddbMock.on(PutCommand).resolves({});
});

afterEach(() => {
  ddbMock.reset();
});

const noopCallback = (() => {}) as Callback<void>;
const emptyContext = {} as Context;

async function invoke(csv: string, table = TABLE) {
  return handler(
    { USER_INFO_CSV: csv, DDB_TABLE: table },
    emptyContext,
    noopCallback
  );
}

describe('parseUserInfoCsv handler', () => {
  it('parses valid CSV and sends PutCommand per row with expected item shape', async () => {
    const csv = `${CSV_HEADER}
u1,u1@example.com,true,,,Alice
u2,u2@example.com,false,,,Bob`;

    await invoke(csv);

    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TABLE,
      Item: {
        id: 'u1',
        imported: false,
        verified: true,
        data: expect.objectContaining({
          'cognito:username': 'u1',
          email: 'u1@example.com',
          email_verified: 'true',
        }),
      },
    });

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TABLE,
      Item: {
        id: 'u2',
        imported: false,
        verified: false,
        data: expect.objectContaining({
          'cognito:username': 'u2',
          email_verified: 'false',
        }),
      },
    });
  });

  it('treats phone_number_verified TRUE as verified', async () => {
    const csv = `${CSV_HEADER}
p1,,false,+810000,true,`;

    await invoke(csv);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TABLE,
      Item: {
        id: 'p1',
        imported: false,
        verified: true,
        data: {
          'cognito:username': 'p1',
          email: '',
          email_verified: 'false',
          name: '',
          phone_number: '+810000',
          phone_number_verified: 'true',
        },
      },
    });
  });

  it('does not call DynamoDB when CSV has only a header row', async () => {
    const csv = CSV_HEADER;

    await invoke(csv);

    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  it('throws when Zod validation fails', async () => {
    const csv = `${CSV_HEADER}
bad user,foo@example.com,false,,,`;

    await expect(invoke(csv)).rejects.toThrow();
  });

  it('throws when email_verified is true but email is empty', async () => {
    const csv = `${CSV_HEADER}
x1,,true,,,`;

    await expect(invoke(csv)).rejects.toThrow();
  });

  it('throws when PapaParse reports errors', async () => {
    const csv = `${CSV_HEADER}\n"unterminated-quote`;

    await expect(invoke(csv)).rejects.toThrow();
  });

  it('aggregates DynamoDB failures and throws', async () => {
    ddbMock.on(PutCommand).rejects(new Error('ConditionalCheckFailed'));

    const csv = `${CSV_HEADER}
r1,r1@example.com,false,,,`;

    await expect(invoke(csv)).rejects.toThrow(/cognito:username:r1/);
  });
});
