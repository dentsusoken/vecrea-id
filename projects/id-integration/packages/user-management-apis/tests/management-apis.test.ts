/**
 * Hono 経由の管理 API を Cognito をモックして結合テストする。
 */

import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type {
  IntrospectionRequest,
  IntrospectionResponse,
} from '@vecrea/au3te-ts-common/schemas.introspection';
import type { IntrospectionHandlerConfiguration } from '@vecrea/au3te-ts-server/handler.introspection';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createManagementApis } from '../src/index';

const TEST_POOL = 'us-east-1_ExamplePool';
const TEST_STAGING_TABLE = 'UserImportStagingTest';

function listUsersUserType(username: string, sub: string) {
  return {
    Username: username,
    Attributes: [
      { Name: 'sub', Value: sub },
      { Name: 'email', Value: `${username}@test.example` },
    ],
    UserStatus: 'CONFIRMED' as const,
    Enabled: true,
  };
}

function adminGetUserOutput(username: string, sub: string) {
  return {
    Username: username,
    UserAttributes: [
      { Name: 'sub', Value: sub },
      { Name: 'email', Value: `${username}@test.example` },
    ],
    UserStatus: 'CONFIRMED' as const,
    Enabled: true,
  };
}

const cognitoMock = mockClient(CognitoIdentityProviderClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('createManagementApis (Cognito mocked)', () => {
  let cognito: CognitoIdentityProviderClient;

  beforeEach(() => {
    vi.stubEnv('USER_POOL_ID', TEST_POOL);
    vi.stubEnv('DDB_STAGING_TABLE', TEST_STAGING_TABLE);
    cognitoMock.reset();
    ddbMock.reset();
    cognito = new CognitoIdentityProviderClient({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function app() {
    return createManagementApis(cognito, { basePath: '' });
  }

  it('GET /users returns a page and calls ListUsers', async () => {
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [listUsersUserType('jdoe', '11111111-1111-1111-1111-111111111111')],
      PaginationToken: undefined,
    });

    const res = await app().request('/users', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ username: string; userId: string }>;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].username).toBe('jdoe');

    expect(cognitoMock).toHaveReceivedCommandWith(ListUsersCommand, {
      UserPoolId: TEST_POOL,
    });
  });

  it('POST /users creates a user and calls AdminCreateUser', async () => {
    cognitoMock.on(AdminCreateUserCommand).resolves({
      User: listUsersUserType('newuser', '22222222-2222-2222-2222-222222222222'),
    });

    const res = await app().request('/users', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'newuser',
        email: 'newuser@test.example',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { username: string };
    expect(body.username).toBe('newuser');

    expect(cognitoMock).toHaveReceivedCommandWith(AdminCreateUserCommand, {
      UserPoolId: TEST_POOL,
      Username: 'newuser',
    });
  });

  it('GET /users/:userId returns one user via AdminGetUser', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves(
      adminGetUserOutput('jdoe', '33333333-3333-3333-3333-333333333333')
    );

    const res = await app().request('/users/jdoe', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      username: 'jdoe',
      userId: '33333333-3333-3333-3333-333333333333',
    });

    expect(cognitoMock).toHaveReceivedCommandWith(AdminGetUserCommand, {
      UserPoolId: TEST_POOL,
      Username: 'jdoe',
    });
  });

  it('PATCH /users/:userId updates attributes then returns user', async () => {
    cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});
    cognitoMock.on(AdminGetUserCommand).resolves(
      adminGetUserOutput('jdoe', '44444444-4444-4444-4444-444444444444')
    );

    const res = await app().request('/users/jdoe', {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attributes: { given_name: 'Jane' },
      }),
    });

    expect(res.status).toBe(200);
    expect(cognitoMock).toHaveReceivedCommandWith(AdminUpdateUserAttributesCommand, {
      UserPoolId: TEST_POOL,
      Username: 'jdoe',
      UserAttributes: [{ Name: 'given_name', Value: 'Jane' }],
    });
    expect(cognitoMock).toHaveReceivedCommand(AdminGetUserCommand);
  });

  it('DELETE /users/:userId returns 204 and calls AdminDeleteUser', async () => {
    cognitoMock.on(AdminDeleteUserCommand).resolves({});

    const res = await app().request('/users/jdoe', {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');

    expect(cognitoMock).toHaveReceivedCommandWith(AdminDeleteUserCommand, {
      UserPoolId: TEST_POOL,
      Username: 'jdoe',
    });
  });

  it('GET /users/:userId maps UserNotFoundException to 404', async () => {
    cognitoMock.on(AdminGetUserCommand).rejects(
      new UserNotFoundException({
        message: 'User does not exist',
        $metadata: {},
      })
    );

    const res = await app().request('/users/missing', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      code: 'UserNotFoundException',
    });
  });

  it('POST /users/import-csv writes valid rows to staging via PutCommand', async () => {
    ddbMock.on(PutCommand).resolves({});

    const csv =
      'cognito:username,email\n' +
      'user-one,user1@test.example\n' +
      'user-two,user2@test.example\n';

    const form = new FormData();
    form.append('file', new File([csv], 'users.csv', { type: 'text/csv' }));

    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalRows: 2,
      successCount: 2,
      failureCount: 0,
    });

    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TEST_STAGING_TABLE,
      Item: expect.objectContaining({
        id: 'user-one',
        imported: false,
        verified: false,
        data: expect.objectContaining({
          'cognito:username': 'user-one',
          email: 'user1@test.example',
        }),
      }),
    });
    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TEST_STAGING_TABLE,
      Item: expect.objectContaining({
        id: 'user-two',
        data: expect.objectContaining({
          'cognito:username': 'user-two',
          email: 'user2@test.example',
        }),
      }),
    });
  });

  it('POST /users/import-csv sets verified when email_verified is true', async () => {
    ddbMock.on(PutCommand).resolves({});

    const csv =
      'cognito:username,email,email_verified\n' +
      'vuser,v@test.example,true\n';

    const form = new FormData();
    form.append('file', new File([csv], 'users.csv', { type: 'text/csv' }));

    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(200);
    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: TEST_STAGING_TABLE,
      Item: expect.objectContaining({
        id: 'vuser',
        verified: true,
      }),
    });
  });

  it('POST /users/import-csv returns row errors and only puts valid rows', async () => {
    ddbMock.on(PutCommand).resolves({});

    const csv =
      'cognito:username,email\n' +
      'bad name,still@test.example\n' +
      'gooduser,good@test.example\n';

    const form = new FormData();
    form.append('file', new File([csv], 'users.csv', { type: 'text/csv' }));

    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalRows: number;
      successCount: number;
      failureCount: number;
      errors?: { row: number; message: string }[];
    };
    expect(body.totalRows).toBe(2);
    expect(body.successCount).toBe(1);
    expect(body.failureCount).toBe(1);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 1,
          message: expect.stringContaining('cognito:username'),
        }),
      ])
    );
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      Item: expect.objectContaining({ id: 'gooduser' }),
    });
  });

  it('POST /users/import-csv records DynamoDB put failures in errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('ConditionalCheckFailed'));

    const csv = 'cognito:username,email\nsolo,solo@test.example\n';

    const form = new FormData();
    form.append('file', new File([csv], 'users.csv', { type: 'text/csv' }));

    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      totalRows: 1,
      successCount: 0,
      failureCount: 1,
      errors: [
        expect.objectContaining({
          row: 1,
          message: expect.stringContaining('ConditionalCheckFailed'),
        }),
      ],
    });
  });

  it('POST /users/import-csv returns 400 when file field is missing (OpenAPI form validation)', async () => {
    const form = new FormData();
    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success?: boolean;
      error?: { name?: string; message?: string };
    };
    expect(body.success).toBe(false);
    expect(body.error?.name).toBe('ZodError');
    expect(body.error?.message).toContain('file');
    expect(ddbMock).not.toHaveReceivedCommand(PutCommand);
  });

  it('POST /users/import-csv returns 400 when "file" is not a File/Blob (e.g. plain form field)', async () => {
    const form = new FormData();
    form.append('file', 'not-a-upload');

    const res = await app().request('/users/import-csv', {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(false);
    expect(ddbMock).not.toHaveReceivedCommand(PutCommand);
  });

  it('requires bearer token when introspection config is provided', async () => {
    const introspect = vi.fn(
      async (_apiRequest: IntrospectionRequest): Promise<IntrospectionResponse> => ({
        action: 'OK',
        clientId: 1,
      })
    );
    const introspectionConfig: IntrospectionHandlerConfiguration = {
      path: '/api/auth/introspection',
      processApiRequest: async () => {
        throw new Error('not used in this test');
      },
      validateApiResponse: () => {
        throw new Error('not used in this test');
      },
      processApiRequestWithValidation: introspect,
    };

    const authApp = createManagementApis(cognito, {
      basePath: '',
      introspectionConfig,
    });

    const res = await authApp.request('/users', { method: 'GET' });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      message: 'Missing or invalid bearer token',
    });
    expect(introspect).not.toHaveBeenCalled();
  });

  it('allows /users when introspection action is OK', async () => {
    cognitoMock.on(ListUsersCommand).resolves({ Users: [] });
    const introspect = vi.fn(
      async (_apiRequest: IntrospectionRequest): Promise<IntrospectionResponse> => ({
        action: 'OK',
        clientId: 1,
        subject: 'subject-1',
        scopes: ['users:read'],
      })
    );
    const introspectionConfig: IntrospectionHandlerConfiguration = {
      path: '/api/auth/introspection',
      processApiRequest: async () => {
        throw new Error('not used in this test');
      },
      validateApiResponse: () => {
        throw new Error('not used in this test');
      },
      processApiRequestWithValidation: introspect,
    };
    const authApp = createManagementApis(cognito, {
      basePath: '',
      introspectionConfig,
    });

    const res = await authApp.request('/users', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(res.status).toBe(200);
    expect(introspect).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'test-token',
        htm: 'GET',
      })
    );
  });

  it('returns 403 when introspection action is FORBIDDEN', async () => {
    const introspect = vi.fn(
      async (_apiRequest: IntrospectionRequest): Promise<IntrospectionResponse> => ({
        action: 'FORBIDDEN',
        clientId: 1,
        responseContent: 'insufficient_scope',
      })
    );
    const introspectionConfig: IntrospectionHandlerConfiguration = {
      path: '/api/auth/introspection',
      processApiRequest: async () => {
        throw new Error('not used in this test');
      },
      validateApiResponse: () => {
        throw new Error('not used in this test');
      },
      processApiRequestWithValidation: introspect,
    };
    const authApp = createManagementApis(cognito, {
      basePath: '',
      introspectionConfig,
    });

    const res = await authApp.request('/users', {
      method: 'GET',
      headers: { Authorization: 'Bearer forbidden-token' },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      message: 'Forbidden by token introspection',
    });
  });
});
