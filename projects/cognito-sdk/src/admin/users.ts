import type {
  CognitoIdentityProviderClient,
  UserType,
  AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserAttributesCommand,
  AdminSetUserPasswordCommand,
  AdminResetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

function attrsToMap(attrs?: AttributeType[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of attrs ?? []) {
    if (a.Name && a.Value !== undefined) map[a.Name] = a.Value;
  }
  return map;
}

export interface AdminUserInfo {
  username: string;
  status: string;
  enabled: boolean;
  attributes: Record<string, string>;
  userCreateDate?: Date;
  userLastModifiedDate?: Date;
}

function fromUserType(u: UserType): AdminUserInfo {
  return {
    username: u.Username ?? "",
    status: u.UserStatus ?? "",
    enabled: u.Enabled ?? false,
    attributes: attrsToMap(u.Attributes),
    userCreateDate: u.UserCreateDate,
    userLastModifiedDate: u.UserLastModifiedDate,
  };
}

export async function createUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: {
    username: string;
    temporaryPassword?: string;
    attributes?: Record<string, string>;
    sendEmail?: boolean;
  },
): Promise<AdminUserInfo> {
  try {
    const res = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: params.username,
        TemporaryPassword: params.temporaryPassword,
        UserAttributes: params.attributes
          ? Object.entries(params.attributes).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
        MessageAction: params.sendEmail === false ? "SUPPRESS" : undefined,
      }),
    );
    return fromUserType(res.User!);
  } catch (e) {
    wrapError(e);
  }
}

export async function getUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<AdminUserInfo> {
  try {
    const res = await client.send(
      new AdminGetUserCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
    return {
      username: res.Username ?? "",
      status: res.UserStatus ?? "",
      enabled: res.Enabled ?? false,
      attributes: attrsToMap(res.UserAttributes),
      userCreateDate: res.UserCreateDate,
      userLastModifiedDate: res.UserLastModifiedDate,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function deleteUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function enableUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminEnableUserCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function disableUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function confirmSignUp(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminConfirmSignUpCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function updateAttributes(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string; attributes: Record<string, string> },
): Promise<void> {
  try {
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: params.username,
        UserAttributes: Object.entries(params.attributes).map(([Name, Value]) => ({ Name, Value })),
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function deleteAttributes(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string; attributeNames: string[] },
): Promise<void> {
  try {
    await client.send(
      new AdminDeleteUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: params.username,
        UserAttributeNames: params.attributeNames,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function setPassword(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string; password: string; permanent?: boolean },
): Promise<void> {
  try {
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: params.username,
        Password: params.password,
        Permanent: params.permanent ?? true,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function resetPassword(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminResetUserPasswordCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function signOutGlobally(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminUserGlobalSignOutCommand({ UserPoolId: userPoolId, Username: params.username }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export interface ListUsersParams {
  filter?: string;
  limit?: number;
  paginationToken?: string;
  attributesToGet?: string[];
}

export async function listUsers(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params?: ListUsersParams,
): Promise<{ users: AdminUserInfo[]; paginationToken?: string }> {
  try {
    const res = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: params?.filter,
        Limit: params?.limit,
        PaginationToken: params?.paginationToken,
        AttributesToGet: params?.attributesToGet,
      }),
    );
    return {
      users: (res.Users ?? []).map(fromUserType),
      paginationToken: res.PaginationToken,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function listAllUsers(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params?: Omit<ListUsersParams, "paginationToken">,
): Promise<AdminUserInfo[]> {
  const all: AdminUserInfo[] = [];
  let token: string | undefined;
  do {
    const res = await listUsers(client, userPoolId, { ...params, paginationToken: token });
    all.push(...res.users);
    token = res.paginationToken;
  } while (token);
  return all;
}
