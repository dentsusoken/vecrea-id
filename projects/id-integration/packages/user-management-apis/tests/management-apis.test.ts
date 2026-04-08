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
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createManagementApis } from '../src/index';

const TEST_POOL = 'us-east-1_ExamplePool';

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

describe('createManagementApis (Cognito mocked)', () => {
  let cognito: CognitoIdentityProviderClient;

  beforeEach(() => {
    vi.stubEnv('USER_POOL_ID', TEST_POOL);
    cognitoMock.reset();
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
});
