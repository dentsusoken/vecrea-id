"use server";

import { createCognitoAdmin } from "@vecrea/cognito-sdk/admin";

export interface AdminConfig {
  region: string;
  userPoolId: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

function serializeError(e: unknown): { error: string } {
  if (e instanceof Error) {
    const code = (e as { code?: string }).code;
    return { error: code ? `[${code}] ${e.message}` : e.message };
  }
  return { error: String(e) };
}

function makeAdmin(cfg: AdminConfig) {
  return createCognitoAdmin({
    region: cfg.region,
    userPoolId: cfg.userPoolId,
    credentials: cfg.credentials,
  });
}

// ---- Users ----

export async function adminCreateUser(
  cfg: AdminConfig,
  params: {
    username: string;
    temporaryPassword?: string;
    attributes?: Record<string, string>;
    sendEmail?: boolean;
  },
) {
  try {
    return await makeAdmin(cfg).users.create(params);
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminGetUser(cfg: AdminConfig, params: { username: string }) {
  try {
    return await makeAdmin(cfg).users.get(params);
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminDeleteUser(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.delete(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminEnableUser(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.enable(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminDisableUser(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.disable(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminConfirmSignUp(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.confirmSignUp(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminUpdateAttributes(
  cfg: AdminConfig,
  params: { username: string; attributes: Record<string, string> },
) {
  try {
    await makeAdmin(cfg).users.updateAttributes(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminSetPassword(
  cfg: AdminConfig,
  params: { username: string; password: string; permanent?: boolean },
) {
  try {
    await makeAdmin(cfg).users.setPassword(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminResetPassword(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.resetPassword(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminSignOutGlobally(cfg: AdminConfig, params: { username: string }) {
  try {
    await makeAdmin(cfg).users.signOutGlobally(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminListUsers(
  cfg: AdminConfig,
  params?: { filter?: string; limit?: number },
) {
  try {
    return await makeAdmin(cfg).users.list(params);
  } catch (e) {
    return serializeError(e);
  }
}

// ---- Groups ----

export async function adminCreateGroup(
  cfg: AdminConfig,
  params: { groupName: string; description?: string },
) {
  try {
    return await makeAdmin(cfg).groups.create(params);
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminGetGroup(cfg: AdminConfig, params: { groupName: string }) {
  try {
    return await makeAdmin(cfg).groups.get(params);
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminUpdateGroup(
  cfg: AdminConfig,
  params: { groupName: string; description?: string },
) {
  try {
    await makeAdmin(cfg).groups.update(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminDeleteGroup(cfg: AdminConfig, params: { groupName: string }) {
  try {
    await makeAdmin(cfg).groups.delete(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminListAllGroups(cfg: AdminConfig) {
  try {
    return await makeAdmin(cfg).groups.listAll();
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminAddUserToGroup(
  cfg: AdminConfig,
  params: { groupName: string; username: string },
) {
  try {
    await makeAdmin(cfg).groups.addUser(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminRemoveUserFromGroup(
  cfg: AdminConfig,
  params: { groupName: string; username: string },
) {
  try {
    await makeAdmin(cfg).groups.removeUser(params);
    return { success: true };
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminListGroupsForUser(cfg: AdminConfig, params: { username: string }) {
  try {
    return await makeAdmin(cfg).groups.listForUser(params);
  } catch (e) {
    return serializeError(e);
  }
}

export async function adminListUsersInGroup(cfg: AdminConfig, params: { groupName: string }) {
  try {
    return await makeAdmin(cfg).groups.listUsers(params);
  } catch (e) {
    return serializeError(e);
  }
}

// ---- Auth ----

export async function adminSignIn(
  cfg: AdminConfig,
  params: { clientId: string; username: string; password: string },
) {
  try {
    return await makeAdmin(cfg).auth.signIn(params);
  } catch (e) {
    return serializeError(e);
  }
}
