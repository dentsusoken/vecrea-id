/**
 * Default OAuth scopes expected on access tokens (define the same values in Authlete).
 * Hosts may document these for clients; change here if you rename scopes.
 */
export const USER_MANAGEMENT_SCOPES = {
  READ: 'manage:users:read',
  WRITE: 'manage:users:write',
  DELETE: 'manage:users:delete',
  IMPORT: 'manage:users:import',
} as const;

export type UserManagementScope =
  (typeof USER_MANAGEMENT_SCOPES)[keyof typeof USER_MANAGEMENT_SCOPES];
