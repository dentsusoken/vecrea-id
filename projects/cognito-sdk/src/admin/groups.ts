import type { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  CreateGroupCommand,
  GetGroupCommand,
  UpdateGroupCommand,
  DeleteGroupCommand,
  ListGroupsCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export interface GroupInfo {
  groupName: string;
  description?: string;
  roleArn?: string;
  precedence?: number;
  creationDate?: Date;
  lastModifiedDate?: Date;
}

export async function createGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  },
): Promise<GroupInfo> {
  try {
    const res = await client.send(
      new CreateGroupCommand({
        UserPoolId: userPoolId,
        GroupName: params.groupName,
        Description: params.description,
        RoleArn: params.roleArn,
        Precedence: params.precedence,
      }),
    );
    const g = res.Group!;
    return {
      groupName: g.GroupName ?? "",
      description: g.Description,
      roleArn: g.RoleArn,
      precedence: g.Precedence,
      creationDate: g.CreationDate,
      lastModifiedDate: g.LastModifiedDate,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function getGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { groupName: string },
): Promise<GroupInfo> {
  try {
    const res = await client.send(
      new GetGroupCommand({ UserPoolId: userPoolId, GroupName: params.groupName }),
    );
    const g = res.Group!;
    return {
      groupName: g.GroupName ?? "",
      description: g.Description,
      roleArn: g.RoleArn,
      precedence: g.Precedence,
      creationDate: g.CreationDate,
      lastModifiedDate: g.LastModifiedDate,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function updateGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  },
): Promise<void> {
  try {
    await client.send(
      new UpdateGroupCommand({
        UserPoolId: userPoolId,
        GroupName: params.groupName,
        Description: params.description,
        RoleArn: params.roleArn,
        Precedence: params.precedence,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function deleteGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { groupName: string },
): Promise<void> {
  try {
    await client.send(
      new DeleteGroupCommand({ UserPoolId: userPoolId, GroupName: params.groupName }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function listGroups(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params?: { limit?: number; nextToken?: string },
): Promise<{ groups: GroupInfo[]; nextToken?: string }> {
  try {
    const res = await client.send(
      new ListGroupsCommand({
        UserPoolId: userPoolId,
        Limit: params?.limit,
        NextToken: params?.nextToken,
      }),
    );
    return {
      groups: (res.Groups ?? []).map((g) => ({
        groupName: g.GroupName ?? "",
        description: g.Description,
        roleArn: g.RoleArn,
        precedence: g.Precedence,
        creationDate: g.CreationDate,
        lastModifiedDate: g.LastModifiedDate,
      })),
      nextToken: res.NextToken,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function listAllGroups(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
): Promise<GroupInfo[]> {
  const all: GroupInfo[] = [];
  let token: string | undefined;
  do {
    const res = await listGroups(client, userPoolId, { nextToken: token });
    all.push(...res.groups);
    token = res.nextToken;
  } while (token);
  return all;
}

export async function addUserToGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { groupName: string; username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        GroupName: params.groupName,
        Username: params.username,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function removeUserFromGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { groupName: string; username: string },
): Promise<void> {
  try {
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: userPoolId,
        GroupName: params.groupName,
        Username: params.username,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function listGroupsForUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { username: string; limit?: number; nextToken?: string },
): Promise<{ groups: GroupInfo[]; nextToken?: string }> {
  try {
    const res = await client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: params.username,
        Limit: params.limit,
        NextToken: params.nextToken,
      }),
    );
    return {
      groups: (res.Groups ?? []).map((g) => ({
        groupName: g.GroupName ?? "",
        description: g.Description,
        roleArn: g.RoleArn,
        precedence: g.Precedence,
        creationDate: g.CreationDate,
        lastModifiedDate: g.LastModifiedDate,
      })),
      nextToken: res.NextToken,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function listUsersInGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: { groupName: string; limit?: number; nextToken?: string },
): Promise<{ usernames: string[]; nextToken?: string }> {
  try {
    const res = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: params.groupName,
        Limit: params.limit,
        NextToken: params.nextToken,
      }),
    );
    return {
      usernames: (res.Users ?? []).map((u) => u.Username ?? ""),
      nextToken: res.NextToken,
    };
  } catch (e) {
    wrapError(e);
  }
}
