import { z } from 'zod';

const optionalString = z.string().optional();

const csvBooleanString = z
  .string()
  .refine(
    (v) =>
      v === '' ||
      v === 'true' ||
      v === 'false' ||
      v === 'TRUE' ||
      v === 'FALSE',
    'Must be empty, true, false, TRUE, or FALSE (Cognito CSV)'
  );

const csvBirthdate = z
  .string()
  .refine(
    (v) => v === '' || /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(v),
    'birthdate must be mm/dd/yyyy when set'
  );

const csvEpochSeconds = z
  .string()
  .refine(
    (v) => v === '' || (/^\d+$/.test(v) && Number.isSafeInteger(Number(v))),
    'updated_at must be epoch seconds as a decimal string when set'
  );

const isTruthy = (v: string | undefined) => v === 'true' || v === 'TRUE';

/** Cognito CSV インポート標準列のみ（カスタム属性なし）。PapaParse `header: true` の 1 行に対応。 */
export const cognitoImportDataSchema = z
  .object({
    'cognito:username': z
      .string()
      .min(1, 'cognito:username is required')
      .refine(
        (s) => !/[\s\t]/.test(s),
        'cognito:username must not contain spaces or tabs'
      ),
    name: optionalString,
    given_name: optionalString,
    family_name: optionalString,
    middle_name: optionalString,
    nickname: optionalString,
    preferred_username: optionalString,
    profile: optionalString,
    picture: optionalString,
    website: optionalString,
    email: optionalString,
    email_verified: optionalString,
    gender: optionalString,
    birthdate: optionalString,
    zoneinfo: optionalString,
    locale: optionalString,
    phone_number: optionalString,
    phone_number_verified: optionalString,
    address: optionalString,
    updated_at: optionalString,
    'cognito:mfa_enabled': optionalString,
    /** Staging / migration only (e.g. DynamoDB `Item.data`); not a Cognito CSV standard column for bulk import. */
    password_hash: optionalString,
  })
  .strict()
  .superRefine((row, ctx) => {
    const emailVerified = row.email_verified;
    if (emailVerified !== undefined && emailVerified !== '') {
      const r = csvBooleanString.safeParse(emailVerified);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? 'Invalid email_verified',
          path: ['email_verified'],
        });
      }
    }

    const phoneVerified = row.phone_number_verified;
    if (phoneVerified !== undefined && phoneVerified !== '') {
      const r = csvBooleanString.safeParse(phoneVerified);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? 'Invalid phone_number_verified',
          path: ['phone_number_verified'],
        });
      }
    }

    if (isTruthy(emailVerified) && !(row.email?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'email is required when email_verified is true',
        path: ['email'],
      });
    }

    if (isTruthy(phoneVerified) && !(row.phone_number?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'phone_number is required when phone_number_verified is true',
        path: ['phone_number'],
      });
    }

    const mfa = row['cognito:mfa_enabled'];
    if (mfa !== undefined && mfa !== '') {
      const r = csvBooleanString.safeParse(mfa);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? 'Invalid cognito:mfa_enabled',
          path: ['cognito:mfa_enabled'],
        });
      }
    }

    const birthdate = row.birthdate;
    if (birthdate !== undefined && birthdate !== '') {
      const r = csvBirthdate.safeParse(birthdate);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? 'Invalid birthdate',
          path: ['birthdate'],
        });
      }
    }

    const updatedAt = row.updated_at;
    if (updatedAt !== undefined && updatedAt !== '') {
      const r = csvEpochSeconds.safeParse(updatedAt);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? 'Invalid updated_at',
          path: ['updated_at'],
        });
      }
    }
  });

export type CognitoImportData = z.infer<typeof cognitoImportDataSchema>;
