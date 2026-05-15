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

/**
 * AWS IAM credentials used to authenticate admin requests.
 * These are passed directly to the AWS SDK and must have appropriate
 * `cognito-idp:Admin*` permissions on the target User Pool.
 */
export interface AwsCredentials {
  /** AWS access key ID (e.g. `"AKIAIOSFODNN7EXAMPLE"`). */
  accessKeyId: string;
  /** AWS secret access key. */
  secretAccessKey: string;
  /** Temporary session token — required when using short-lived credentials (STS/IAM Role). */
  sessionToken?: string;
}

/**
 * Configuration for the admin Cognito SDK.
 * Admin operations require IAM authentication (SigV4) and must only be
 * performed server-side — never expose IAM credentials to browser clients.
 */
export interface CognitoAdminConfig {
  /** AWS region where the User Pool is hosted (e.g. `"us-east-1"`). */
  region: string;
  /** User Pool ID (e.g. `"us-east-1_aBcDeFgHi"`). */
  userPoolId: string;
  /** IAM credentials with `cognito-idp:*` permission on the User Pool. */
  credentials: AwsCredentials;
}

/**
 * Admin operations for managing users in a User Pool.
 * All methods require IAM authentication.
 */
export interface CognitoAdminUsers {
  /**
   * Creates a new user account in the User Pool.
   * The user is created in `FORCE_CHANGE_PASSWORD` state by default.
   *
   * @param params.username - Username or email address for the new account.
   * @param params.temporaryPassword - Temporary password. If omitted, Cognito generates one.
   * @param params.attributes - User attributes (e.g. `{ email: "...", given_name: "..." }`).
   * @param params.sendEmail - Set to `false` to suppress the welcome/invite email.
   * @returns The newly created user's profile.
   * @throws {CognitoError} `UsernameExists` — account already exists.
   */
  create(params: {
    username: string;
    temporaryPassword?: string;
    attributes?: Record<string, string>;
    sendEmail?: boolean;
  }): Promise<AdminUserInfo>;

  /**
   * Fetches a user's profile from the User Pool.
   *
   * @param params.username - The target user's username.
   * @returns The user's profile including status, enabled flag, and all attributes.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   */
  get(params: { username: string }): Promise<AdminUserInfo>;

  /**
   * Permanently deletes a user account.
   *
   * @param params.username - The username of the account to delete.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   */
  delete(params: { username: string }): Promise<void>;

  /**
   * Re-enables a disabled user account.
   *
   * @param params.username - The username of the account to enable.
   */
  enable(params: { username: string }): Promise<void>;

  /**
   * Disables a user account, preventing sign-in without deleting data.
   *
   * @param params.username - The username of the account to disable.
   */
  disable(params: { username: string }): Promise<void>;

  /**
   * Administratively confirms a user account without requiring the user
   * to submit a confirmation code. Moves the user from `UNCONFIRMED` to `CONFIRMED`.
   *
   * @param params.username - The username of the unconfirmed user.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   */
  confirmSignUp(params: { username: string }): Promise<void>;

  /**
   * Updates one or more attributes for the specified user.
   * Custom attributes must be prefixed with `custom:`.
   *
   * @param params.username - The target user.
   * @param params.attributes - Map of attribute name → value to set.
   */
  updateAttributes(params: { username: string; attributes: Record<string, string> }): Promise<void>;

  /**
   * Deletes one or more attributes from the specified user.
   *
   * @param params.username - The target user.
   * @param params.attributeNames - List of attribute names to remove.
   */
  deleteAttributes(params: { username: string; attributeNames: string[] }): Promise<void>;

  /**
   * Sets or resets a user's password.
   *
   * @param params.username - The target user.
   * @param params.password - The new password.
   * @param params.permanent - If `true` (default), the password is permanent and the
   *   user does not need to change it on next sign-in. If `false`, it is temporary
   *   and the user will face a `NEW_PASSWORD_REQUIRED` challenge.
   * @throws {CognitoError} `InvalidPassword` — password policy violation.
   */
  setPassword(params: { username: string; password: string; permanent?: boolean }): Promise<void>;

  /**
   * Triggers a password reset for the user. Cognito sends a reset code to
   * the user's verified email or phone number.
   *
   * @param params.username - The target user.
   */
  resetPassword(params: { username: string }): Promise<void>;

  /**
   * Signs out the user from all devices by invalidating all issued tokens.
   *
   * @param params.username - The target user.
   */
  signOutGlobally(params: { username: string }): Promise<void>;

  /**
   * Lists users in the User Pool with optional filtering.
   *
   * @param params.filter - Cognito filter expression, e.g. `"email = \"user@example.com\""`.
   *   See [ListUsers filter syntax](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html#cognito-user-pools-searching-for-users-using-listusers-api).
   * @param params.limit - Maximum number of users per page.
   * @param params.paginationToken - Token from a previous response to fetch the next page.
   * @param params.attributesToGet - Subset of attributes to return (returns all if omitted).
   * @returns Page of users and an optional `paginationToken` for the next page.
   */
  list(params?: ListUsersParams): Promise<{ users: AdminUserInfo[]; paginationToken?: string }>;

  /**
   * Fetches all users in the User Pool, automatically paginating through all pages.
   *
   * @param params - Same as {@link list} except `paginationToken` (managed internally).
   * @returns All matching users.
   */
  listAll(params?: Omit<ListUsersParams, "paginationToken">): Promise<AdminUserInfo[]>;
}

/**
 * Admin operations for managing groups in a User Pool.
 */
export interface CognitoAdminGroups {
  /**
   * Creates a new group.
   *
   * @param params.groupName - Unique name for the group.
   * @param params.description - Optional human-readable description.
   * @param params.roleArn - IAM role ARN to associate with the group (used in identity pools).
   * @param params.precedence - Numeric priority (lower number = higher precedence) used to
   *   resolve role conflicts when a user belongs to multiple groups.
   * @returns The newly created group.
   */
  create(params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  }): Promise<GroupInfo>;

  /**
   * Fetches a group's details.
   *
   * @param params.groupName - The name of the group.
   * @throws {CognitoError} `ResourceNotFound` — group does not exist.
   */
  get(params: { groupName: string }): Promise<GroupInfo>;

  /**
   * Updates an existing group's description, role ARN, or precedence.
   *
   * @param params.groupName - The group to update.
   * @param params.description - New description.
   * @param params.roleArn - New IAM role ARN.
   * @param params.precedence - New precedence value.
   */
  update(params: {
    groupName: string;
    description?: string;
    roleArn?: string;
    precedence?: number;
  }): Promise<void>;

  /**
   * Deletes a group. Does not delete the users that belong to it.
   *
   * @param params.groupName - The group to delete.
   */
  delete(params: { groupName: string }): Promise<void>;

  /**
   * Lists groups in the User Pool (paginated).
   *
   * @param params.limit - Maximum number of groups per page.
   * @param params.nextToken - Token from a previous response to fetch the next page.
   */
  list(params?: { limit?: number; nextToken?: string }): Promise<{
    groups: GroupInfo[];
    nextToken?: string;
  }>;

  /**
   * Fetches all groups in the User Pool, automatically paginating through all pages.
   *
   * @returns All groups.
   */
  listAll(): Promise<GroupInfo[]>;

  /**
   * Adds a user to a group.
   *
   * @param params.groupName - The target group.
   * @param params.username - The user to add.
   */
  addUser(params: { groupName: string; username: string }): Promise<void>;

  /**
   * Removes a user from a group.
   *
   * @param params.groupName - The target group.
   * @param params.username - The user to remove.
   */
  removeUser(params: { groupName: string; username: string }): Promise<void>;

  /**
   * Lists all groups that a user belongs to.
   *
   * @param params.username - The target user.
   * @param params.limit - Maximum number of groups per page.
   * @param params.nextToken - Token for the next page.
   */
  listForUser(params: {
    username: string;
    limit?: number;
    nextToken?: string;
  }): Promise<{ groups: GroupInfo[]; nextToken?: string }>;

  /**
   * Lists the usernames of all users in a group.
   *
   * @param params.groupName - The target group.
   * @param params.limit - Maximum number of usernames per page.
   * @param params.nextToken - Token for the next page.
   */
  listUsers(params: {
    groupName: string;
    limit?: number;
    nextToken?: string;
  }): Promise<{ usernames: string[]; nextToken?: string }>;
}

/**
 * Admin authentication operations that bypass client-side flows.
 */
export interface CognitoAdminAuth {
  /**
   * Signs a user in server-side using `ADMIN_USER_PASSWORD_AUTH` flow.
   * The password is sent to Cognito in plain text over the server-to-AWS link
   * (protected by SigV4 / TLS). Use this for backend-initiated authentication.
   *
   * The App Client must have `ALLOW_ADMIN_USER_PASSWORD_AUTH` enabled.
   *
   * @param params.clientId - The App Client ID.
   * @param params.username - The user's username or email alias.
   * @param params.password - The user's password.
   * @param params.onChallenge - Handlers for MFA / new-password challenges.
   * @returns Authentication tokens.
   * @throws {CognitoError} `NotAuthorized` — wrong credentials.
   * @throws {CognitoError} `UserNotConfirmed` — account not verified.
   */
  signIn(params: {
    clientId: string;
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;
}

/**
 * Admin Cognito client providing user management, group management,
 * and server-side authentication. Obtain via {@link createCognitoAdmin}.
 *
 * All operations require IAM authentication. Never use in browser code.
 */
export interface CognitoAdmin {
  /** User management operations (create, delete, enable/disable, set password, etc.). */
  users: CognitoAdminUsers;
  /** Group management operations (create, delete, membership). */
  groups: CognitoAdminGroups;
  /** Server-side authentication. */
  auth: CognitoAdminAuth;
}

/**
 * Creates a {@link CognitoAdmin} client bound to the given User Pool and IAM credentials.
 * Must only be used server-side — IAM credentials must never be exposed to browser clients.
 *
 * @example
 * ```typescript
 * import { createCognitoAdmin } from "@vecrea/cognito-sdk/admin";
 *
 * const admin = createCognitoAdmin({
 *   region: "us-east-1",
 *   userPoolId: "us-east-1_aBcDeFgHi",
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 * });
 *
 * const user = await admin.users.get({ username: "user@example.com" });
 * await admin.groups.addUser({ groupName: "admins", username: user.username });
 * ```
 */
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
