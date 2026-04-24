/**
 * Shapes aligned with @vecrea/user-management-apis OpenAPI (userSchema / list / CRUD).
 */

export type UserStatus =
  | 'ARCHIVED'
  | 'COMPROMISED'
  | 'CONFIRMED'
  | 'EXTERNAL_PROVIDER'
  | 'FORCE_CHANGE_PASSWORD'
  | 'RESET_REQUIRED'
  | 'UNCONFIRMED'
  | 'UNKNOWN';

export type MfaOption = {
  deliveryMedium?: string;
  attributeName?: string;
};

export type User = {
  userId: string;
  username: string;
  email: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  enabled?: boolean;
  status: UserStatus;
  mfaOptions?: MfaOption[];
  preferredMfaSetting?: string;
  userMfaSettingList?: string[];
  createdAt?: string;
  updatedAt?: string;
  attributes?: Record<string, string>;
};

export type ListUsersResponse = {
  items: User[];
  paginationToken?: string;
};

export type CreateUserRequest = {
  username: string;
  email?: string;
  attributes?: Record<string, string>;
  temporaryPassword?: string;
  suppressInvitation?: boolean;
};

export type UpdateUserRequest = {
  enabled?: boolean;
  email?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  attributes?: Record<string, string>;
};

export type ImportUsersCsvResponse = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  importBatchId?: string;
  errors?: Array<{ row: number; message: string }>;
};

export type BatchDeleteUsersResponse = {
  requestedCount: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{ username: string; message: string; code?: string }>;
};
