/**
 * Cognito **Migrate user** Lambda trigger: on `UserMigration_Authentication`, looks up the user in the DynamoDB
 * staging table, parses `Item.data` with `cognitoImportDataSchema`, verifies `data.password_hash` with
 * `verifyPasswordHash`, then returns `userAttributes` from the validated user object (excluding skipped keys).
 * `UserMigration_ForgotPassword` is passed through unchanged (no migration on that path).
 *
 * **Environment:** `DDB_TABLE` (required). `HASH_ALG` optional; when unset, verification uses `PLAIN_TEXT`. When set,
 * must be one of `HASH_ALGS` from `../passwordHash/hashAlgorithms`. `HASH_SALT` optional pepper or PBKDF2/scrypt salt.
 * Optional: `PBKDF2_ITERATIONS`, `SCRYPT_N`, `SCRYPT_R`, `SCRYPT_P`, `SCRYPT_KEYLEN`.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { UserMigrationTriggerHandler } from 'aws-lambda';
import type { StringMap } from 'aws-lambda/trigger/cognito-user-pool-trigger/_common';
import {
  HASH_ALGS,
  type HashAlg,
  isHashAlg,
  verifyPasswordHash,
} from '../passwordHash';
import { cognitoImportDataSchema } from '../schemas';
import type { CognitoImportData } from '../schemas';

/**
 * Staging / CSV-shaped fields that must not be copied into Cognito `userAttributes` on migration.
 *
 * Differs from {@link importUnVerifiedUsers}'s `SKIP_ATTRIBUTE_NAMES`: `AdminCreateUser` cannot set some flags the
 * same way; the **Migrate user** trigger instead returns a `userAttributes` map that becomes the user profile (AWS
 * examples include `email_verified`). We therefore **do not** skip `email_verified` / `phone_number_verified` here.
 *
 * - `password_hash` — lives on `Item.data` (same shape as `parseUserInfoCsv` output); not sent as a Cognito attribute.
 * - `cognito:username` — bulk CSV column; pool username is already chosen at sign-in (see alias notes in AWS docs).
 * - `cognito:mfa_enabled` — CSV column; SMS MFA for migrated users is `response.enableSMSMFA`, not this attribute.
 * - `updated_at` — import metadata / non-profile field in our CSV shape.
 */
const SKIP_ATTRIBUTE_NAMES = new Set([
  'cognito:mfa_enabled',
  'cognito:username',
  'updated_at',
  'password_hash',
]);

/**
 * Writes a structured log line, then rethrows so the Lambda invocation fails.
 * @param context Step label included in the log prefix.
 * @param error Original error or value to log and throw.
 */
function logErrorAndRethrow(context: string, error: unknown): never {
  console.error(`[userMigrationTrigger] ${context}`, error);
  throw error;
}

/** @throws If the variable is missing or empty. */
function requireEnvDdbTable(): string {
  const value = process.env.DDB_TABLE;
  if (value === undefined || value === '') {
    throw new Error('DDB_TABLE environment variable is not set');
  }
  return value;
}

/**
 * @returns Parsed algorithm when `HASH_ALG` is set and valid; `undefined` → {@link verifyPasswordHash} uses `PLAIN_TEXT`.
 * @throws If `HASH_ALG` is non-empty but not a known value.
 */
function resolveHashAlgFromEnv(): HashAlg | undefined {
  const raw = process.env.HASH_ALG;
  if (raw === undefined || raw === '') return undefined;
  if (!isHashAlg(raw)) {
    throw new Error(
      `HASH_ALG environment variable must be one of: ${HASH_ALGS.join(', ')}`
    );
  }
  return raw;
}

/**
 * Optional global salt (pepper) from the environment, as used by the legacy password scheme.
 * @returns The raw string, or `undefined` when unset or empty (do not log this value).
 */
function resolveHashSaltFromEnv(): string | undefined {
  const raw = process.env.HASH_SALT;
  if (raw === undefined || raw === '') return undefined;
  return raw;
}

/**
 * @throws On invalid `data` (Zod), after logging.
 */
function parseStagingUserData(
  item: Record<string, unknown>
): CognitoImportData {
  try {
    return cognitoImportDataSchema.parse(item['data']);
  } catch (e) {
    logErrorAndRethrow('parseStagingUserData', e);
  }
}

/**
 * Loads one staging item by partition key `id` (username).
 * @throws On DynamoDB errors (logged, then rethrown).
 */
async function getStagingItemByUsername(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  username: string
): Promise<Record<string, unknown> | undefined> {
  try {
    const { Item } = await ddbClient.send(
      new GetCommand({
        Key: { id: username },
        TableName: tableName,
      })
    );
    return Item as Record<string, unknown> | undefined;
  } catch (e) {
    logErrorAndRethrow('getStagingItemByUsername', e);
  }
}

/**
 * Fetches the staging row, parses `Item.data`, verifies `password_hash` from that payload, returns the same parsed user.
 * @throws `User not found.` or `Invalid Password.` when credentials do not match (Cognito migration contract).
 * @throws When `SCRYPT` is configured but `HASH_SALT` is missing (see `verifyScryptHex`).
 */
async function loadUserForMigration(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  plainPassword: string,
  hashAlg: HashAlg | undefined,
  hashSalt: string | undefined
): Promise<CognitoImportData> {
  const item = await getStagingItemByUsername(ddbClient, tableName, username);

  if (!item) {
    throw new Error('User not found.');
  }

  const user = parseStagingUserData(item);

  const storedHash = user.password_hash;
  if (storedHash === undefined || storedHash === null || storedHash === '') {
    throw new Error('Invalid Password.');
  }

  const ok = await verifyPasswordHash(
    plainPassword,
    storedHash,
    hashAlg,
    hashSalt
  );
  if (!ok) {
    throw new Error('Invalid Password.');
  }

  return user;
}

function userToAttributes(user: CognitoImportData): StringMap {
  const attributes: StringMap = {};

  for (const [name, value] of Object.entries(user)) {
    if (SKIP_ATTRIBUTE_NAMES.has(name)) continue;
    if (value === undefined) continue;
    attributes[name] = value;
  }

  return attributes;
}

/**
 * @param event - Cognito user migration trigger event.
 * @returns The event with `response.userAttributes` set on successful authentication migration.
 * @throws When `DDB_TABLE` is missing, `HASH_ALG` is invalid, DynamoDB or schema validation fails, or auth fails.
 */
export const handler: UserMigrationTriggerHandler = async (event) => {
  if (event.triggerSource === 'UserMigration_ForgotPassword') {
    return event;
  }

  const tableName = requireEnvDdbTable();
  const hashAlg = resolveHashAlgFromEnv();
  const hashSalt = resolveHashSaltFromEnv();
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

  const user = await loadUserForMigration(
    ddbClient,
    tableName,
    event.userName,
    event.request.password,
    hashAlg,
    hashSalt
  );

  event.response.userAttributes = userToAttributes(user);
  return event;
};
