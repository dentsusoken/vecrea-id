import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import type { AuthTokens, ChallengeHandlers } from "../shared/types.ts";
import {
  createUser,
  getUser,
  deleteUser,
  enableUser,
  disableUser,
  confirmSignUp,
  updateAttributes,
  deleteAttributes,
  setPassword,
  resetPassword,
  signOutGlobally,
  listUsers,
  listAllUsers,
} from "./users.ts";
import {
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  listGroups,
  listAllGroups,
  addUserToGroup,
  removeUserFromGroup,
  listGroupsForUser,
  listUsersInGroup,
} from "./groups.ts";
import { adminSignIn } from "./auth.ts";
import type { AdminUserInfo, ListUsersParams } from "./users.ts";
import type { GroupInfo } from "./groups.ts";

export type { AuthTokens, ChallengeHandlers, AdminUserInfo, GroupInfo, ListUsersParams };
export { CognitoError, CognitoErrorCode } from "../shared/errors.ts";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface CognitoAdminConfig {
  region: string;
  userPoolId: string;
  credentials: AwsCredentials;
}

export interface CognitoAdminUsers {
  create(params: {
    username: string;
    temporaryPassword?: string;
    attributes?: Record<string, string>;
    sendEmail?: boolean;
  }): Promise<AdminUserInfo>;
  get(params: { username: string }): Promise<AdminUserInfo>;
  delete(params: { username: string }): Promise<void>;
  enable(params: { username: string }): Promise<void>;
  disable(params: { username: string }): Promise<void>;
  confirmSignUp(params: { username: string }): Promise<void>;
  updateAttributes(params: { username: string; attributes: Record<string, string> }): Promise<void>;
  deleteAttributes(params: { username: string; attributeNames: string[] }): Promise<void>;
  setPassword(params: { username: string; password: string; permanent?: boolean }): Promise<void>;
  resetPassword(params: { username: string }): Promise<void>;
  signOutGlobally(params: { username: string }): Promise<void>;
  list(params?: ListUsersParams): Promise<{ users: AdminUserInfo[]; paginationToken?: string }>;
  listAll(params?: Omit<ListUsersParams, "paginationToken">): Promise<AdminUserInfo[]>;
}

export interface CognitoAdminGroups {
  create(params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  }): Promise<GroupInfo>;
  get(params: { groupName: string }): Promise<GroupInfo>;
  update(params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  }): Promise<void>;
  delete(params: { groupName: string }): Promise<void>;
  list(params?: { limit?: number; nextToken?: string }): Promise<{
    groups: GroupInfo[];
    nextToken?: string;
  }>;
  listAll(): Promise<GroupInfo[]>;
  addUser(params: { groupName: string; username: string }): Promise<void>;
  removeUser(params: { groupName: string; username: string }): Promise<void>;
  listForUser(params: {
    username: string;
    limit?: number;
    nextToken?: string;
  }): Promise<{ groups: GroupInfo[]; nextToken?: string }>;
  listUsers(params: {
    groupName: string;
    limit?: number;
    nextToken?: string;
  }): Promise<{ usernames: string[]; nextToken?: string }>;
}

export interface CognitoAdminAuth {
  signIn(params: {
    clientId: string;
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;
}

export interface CognitoAdmin {
  users: CognitoAdminUsers;
  groups: CognitoAdminGroups;
  auth: CognitoAdminAuth;
}

export function createCognitoAdmin(config: CognitoAdminConfig): CognitoAdmin {
  const awsClient = new CognitoIdentityProviderClient({
    region: config.region,
    credentials: config.credentials,
  });
  const { userPoolId } = config;

  const users: CognitoAdminUsers = {
    create: (p) => createUser(awsClient, userPoolId, p),
    get: (p) => getUser(awsClient, userPoolId, p),
    delete: (p) => deleteUser(awsClient, userPoolId, p),
    enable: (p) => enableUser(awsClient, userPoolId, p),
    disable: (p) => disableUser(awsClient, userPoolId, p),
    confirmSignUp: (p) => confirmSignUp(awsClient, userPoolId, p),
    updateAttributes: (p) => updateAttributes(awsClient, userPoolId, p),
    deleteAttributes: (p) => deleteAttributes(awsClient, userPoolId, p),
    setPassword: (p) => setPassword(awsClient, userPoolId, p),
    resetPassword: (p) => resetPassword(awsClient, userPoolId, p),
    signOutGlobally: (p) => signOutGlobally(awsClient, userPoolId, p),
    list: (p) => listUsers(awsClient, userPoolId, p),
    listAll: (p) => listAllUsers(awsClient, userPoolId, p),
  };

  const groups: CognitoAdminGroups = {
    create: (p) => createGroup(awsClient, userPoolId, p),
    get: (p) => getGroup(awsClient, userPoolId, p),
    update: (p) => updateGroup(awsClient, userPoolId, p),
    delete: (p) => deleteGroup(awsClient, userPoolId, p),
    list: (p) => listGroups(awsClient, userPoolId, p),
    listAll: () => listAllGroups(awsClient, userPoolId),
    addUser: (p) => addUserToGroup(awsClient, userPoolId, p),
    removeUser: (p) => removeUserFromGroup(awsClient, userPoolId, p),
    listForUser: (p) => listGroupsForUser(awsClient, userPoolId, p),
    listUsers: (p) => listUsersInGroup(awsClient, userPoolId, p),
  };

  const auth: CognitoAdminAuth = {
    signIn: (p) => adminSignIn(awsClient, userPoolId, p),
  };

  return { users, groups, auth };
}
