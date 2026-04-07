import { z } from '@hono/zod-openapi';
import type {
  DeliveryMediumType,
  UserStatusType,
} from '@aws-sdk/client-cognito-identity-provider';

/** Mirrors Cognito `UserStatusType` (see `models/enums.d.ts`). */
const USER_STATUS_VALUES = [
  'ARCHIVED',
  'COMPROMISED',
  'CONFIRMED',
  'EXTERNAL_PROVIDER',
  'FORCE_CHANGE_PASSWORD',
  'RESET_REQUIRED',
  'UNCONFIRMED',
  'UNKNOWN',
] as const satisfies readonly UserStatusType[];

/** Cognito `DeliveryMediumType` for legacy SMS MFA option rows. */
const DELIVERY_MEDIUM_VALUES = ['EMAIL', 'SMS'] as const satisfies readonly [
  DeliveryMediumType,
  ...DeliveryMediumType[],
];

export const userStatusSchema = z
  .enum(USER_STATUS_VALUES)
  .openapi({ description: 'Cognito UserStatusType' });

export const mfaOptionSchema = z
  .object({
    deliveryMedium: z.enum(DELIVERY_MEDIUM_VALUES).optional(),
    attributeName: z.string().optional(),
  })
  .openapi('MfaOption');

/**
 * User resource: `AdminGetUser` response shape (excluding `$metadata`), with
 * camelCase property names and convenience fields derived from attributes (`userId`, `email`, …).
 */
export const userSchema = z
  .object({
    userId: z
      .string()
      .openapi({ description: 'Stable user identifier (Cognito `sub` attribute)' }),
    username: z
      .string()
      .openapi({ description: 'Sign-in username (`Username`)' }),
    email: z
      .union([z.string().email(), z.null()])
      .openapi({ description: 'Email address' }),
    emailVerified: z.boolean().optional(),
    phoneNumber: z.union([z.string(), z.null()]).optional(),
    phoneNumberVerified: z.boolean().optional(),
    enabled: z
      .boolean()
      .optional()
      .openapi({ description: 'Whether the user is activated for sign-in (`Enabled`)' }),
    status: userStatusSchema,
    mfaOptions: z
      .array(mfaOptionSchema)
      .optional()
      .openapi({
        description:
          'Legacy SMS MFA configuration rows (`MFAOptions`; prefer `userMfaSettingList`)',
      }),
    preferredMfaSetting: z
      .string()
      .optional()
      .openapi({ description: 'Preferred MFA (`PreferredMfaSetting`)' }),
    userMfaSettingList: z
      .array(z.string())
      .optional()
      .openapi({
        description:
          'Activated MFA methods: SMS_MFA, EMAIL_OTP, SOFTWARE_TOKEN_MFA (`UserMFASettingList`)',
      }),
    createdAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ description: 'User creation time (`UserCreateDate`)' }),
    updatedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ description: 'Last modification time (`UserLastModifiedDate`)' }),
    attributes: z
      .record(z.string(), z.string())
      .optional()
      .openapi({
        description: 'Standard and custom attributes (`UserAttributes` as name → value map)',
      }),
  })
  .openapi('User');

/** Request body for `POST /users` (maps to AdminCreateUser–style options). */
export const createUserRequestSchema = z
  .object({
    username: z.string().min(1).openapi({ example: 'jdoe' }),
    email: z.string().email().optional(),
    attributes: z
      .record(z.string(), z.string())
      .optional()
      .openapi({
        description:
          'Standard and custom attributes (e.g. `given_name`). `email` can be set here or via top-level `email`.',
      }),
    temporaryPassword: z
      .string()
      .min(8)
      .optional()
      .openapi({
        description:
          'Initial password; user often lands in `FORCE_CHANGE_PASSWORD` until first successful sign-in.',
      }),
    suppressInvitation: z
      .boolean()
      .optional()
      .openapi({
        description:
          'When true, skips the invitation message (Cognito `MessageAction` `SUPPRESS`).',
      }),
  })
  .openapi('CreateUserRequest');

/** Request body for `PATCH /users/{userId}` (partial update; attributes merge per Cognito rules). */
export const updateUserRequestSchema = z
  .object({
    enabled: z
      .boolean()
      .optional()
      .openapi({
        description: 'Enable or disable the user (`AdminEnableUser` / `AdminDisableUser`).',
      }),
    email: z.union([z.string().email(), z.null()]).optional(),
    emailVerified: z.boolean().optional(),
    phoneNumber: z.union([z.string(), z.null()]).optional(),
    phoneNumberVerified: z.boolean().optional(),
    attributes: z
      .record(z.string(), z.string())
      .optional()
      .openapi({
        description:
          'Attributes to add or replace (`AdminUpdateUserAttributes`); omitted keys are unchanged.',
      }),
  })
  .openapi('UpdateUserRequest');

export const listUsersQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .optional()
    .openapi({
      param: { name: 'limit', in: 'query' },
      description: 'Max results per page (aligns with Cognito `Limit`, max 60).',
      example: 20,
    }),
  paginationToken: z
    .string()
    .optional()
    .openapi({
      param: { name: 'paginationToken', in: 'query' },
      description:
        'Opaque token from a previous `ListUsers` response (`PaginationToken`).',
    }),
});

export const listUsersResponseSchema = z
  .object({
    items: z.array(userSchema),
    paginationToken: z.string().optional().openapi({
      description: 'Present when more results exist; pass as `paginationToken` on the next call.',
    }),
  })
  .openapi('ListUsersResponse');

export const errorBodySchema = z
  .object({
    message: z.string(),
    code: z.string().optional(),
  })
  .openapi('ErrorBody');

export type User = z.infer<typeof userSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type MfaOption = z.infer<typeof mfaOptionSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
