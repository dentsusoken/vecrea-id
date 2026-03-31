/**
 * Lambda handler that parses Cognito user-export CSV and writes validated users to DynamoDB.
 */

import papa from 'papaparse';
import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { cognitoImportDataSchema } from '../schemas';
import type { CognitoImportData } from '../schemas';

/** Lambda event shape: raw CSV payload and target table name. */
interface EventInput {
  /** User-export CSV string (Cognito standard columns). */
  USER_INFO_CSV: string;
  /** DynamoDB table name for PutItem. */
  DDB_TABLE: string;
}

/** Whether a Cognito CSV boolean column (e.g. `email_verified`) is truthy. */
const isCsvTruthy = (value: string | undefined) =>
  value === 'true' || value === 'TRUE';

/** True if email or phone is marked verified in CSV (`true` or `TRUE`). */
const isVerifiedUser = (user: CognitoImportData) =>
  isCsvTruthy(user.email_verified) ||
  isCsvTruthy(user.phone_number_verified);

/**
 * Parses CSV with the first row as headers into an array of row objects.
 * @param csv Raw CSV text
 * @returns Row objects keyed by header names
 * @throws If PapaParse reports `errors` (serialized as JSON in the Error message)
 */
function parseUserCsvRows(csv: string): Record<string, string>[] {
  const { data, errors } = papa.parse<Record<string, string>>(csv, {
    header: true,
  });

  if (errors && errors.length > 0) {
    throw new Error(JSON.stringify(errors, null, 2));
  }

  return data;
}

/**
 * Validates row data as an array of Cognito import records.
 * @param rows Same shape as rows returned from `parseUserCsvRows`
 * @returns Parsed `CognitoImportData[]`
 * @throws On validation failure (Zod error serialized as JSON in the Error message)
 */
function parseValidatedUsers(rows: Record<string, string>[]): CognitoImportData[] {
  const parsed = cognitoImportDataSchema.array().safeParse(rows);

  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error, null, 2));
  }

  return parsed.data;
}

/**
 * Builds a `PutCommand` for persisting one user to DynamoDB.
 * @param table Table name
 * @param user Validated Cognito attributes (stored as `Item.data`)
 * @returns A `PutCommand` ready to send
 */
function putCommandForUser(table: string, user: CognitoImportData) {
  return new PutCommand({
    TableName: table,
    Item: {
      id: user['cognito:username'],
      data: user,
      imported: false,
      verified: isVerifiedUser(user),
    },
  });
}

/**
 * Puts all users in parallel. If any write fails, aggregates failures and throws.
 * @throws When any Put fails (array of username-prefixed messages serialized as JSON)
 */
async function saveUserData(
  ddbClient: DynamoDBDocumentClient,
  table: string,
  users: CognitoImportData[]
): Promise<void> {
  const outcomes = await Promise.allSettled(
    users.map((user) => ddbClient.send(putCommandForUser(table, user)))
  );

  const failures = outcomes.flatMap((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      return [];
    }
    const username = users[index]!['cognito:username'];
    return [`cognito:username:${username} :>> ${outcome.reason}`];
  });

  if (failures.length > 0) {
    throw new Error(JSON.stringify(failures, null, 2));
  }
}

/**
 * Parses and validates CSV, then puts each user row to the given table.
 * @param event Must include `USER_INFO_CSV` and `DDB_TABLE`
 */
export const handler: Handler<EventInput> = async (event) => {
  const rows = parseUserCsvRows(event.USER_INFO_CSV);
  const users = parseValidatedUsers(rows);
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

  await saveUserData(ddbClient, event.DDB_TABLE, users);
};
