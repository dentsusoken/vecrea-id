/**
 * Step Functions task (after `EnrichConfig`): parses a Cognito user-export style CSV string, validates each row
 * with `cognitoImportDataSchema`, and writes staging items (`id`, `data`, `imported`, `verified`) to DynamoDB.
 */

import papa from 'papaparse';
import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { cognitoImportDataSchema } from '../schemas';
import type { CognitoImportData } from '../schemas';

/** Lambda event shape: raw CSV payload and target table name. */
interface EventInput {
  /** User-export CSV string (Cognito standard columns; optional `password_hash` for staging / migration). */
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

function normalizeCsvText(s: string): string {
  return s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function rowRecordFromArray(
  fields: string[],
  row: unknown[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let j = 0; j < fields.length; j++) {
    const v = row[j];
    if (v === undefined) continue;
    const key = fields[j]!;
    if (key === '__parsed_extra') continue;
    out[key] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

/**
 * Row 0 = column names (Cognito export). `header: false` avoids PapaParse
 * `fillHeaderFields` pushing data rows onto `meta.fields` when `data[0]` is
 * not treated as an array.
 */
function parseUserCsvRows(csv: string): Record<string, string>[] {
  const text = normalizeCsvText(csv);
  const parseResult = papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const { data, errors } = parseResult;

  if (errors && errors.length > 0) {
    console.error('[parseUserInfoCsv] parseUserCsvRows: PapaParse errors', errors);
    throw new Error(JSON.stringify(errors, null, 2));
  }

  if (!Array.isArray(data)) {
    throw new Error('CSV parse produced non-array data');
  }

  if (data.length === 0) {
    return [];
  }

  const headerRow = data[0];
  if (!Array.isArray(headerRow)) {
    throw new Error(
      'CSV first row must be the header; check delimiter, quotes, and encoding'
    );
  }

  const fields = headerRow.map((cell) =>
    typeof cell === 'string' ? cell.trim() : String(cell ?? '').trim()
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i];
    if (!Array.isArray(cells)) {
      rows.push({});
      continue;
    }
    rows.push(rowRecordFromArray(fields, cells));
  }
  return rows;
}

/**
 * Validates row data as an array of Cognito import records.
 * @param rows Same shape as rows returned from `parseUserCsvRows`
 * @returns Parsed `CognitoImportData[]`
 * @throws On validation failure (Zod error logged, then thrown as `Error` with JSON message)
 */
function parseValidatedUsers(rows: Record<string, string>[]): CognitoImportData[] {
  const parsed = cognitoImportDataSchema.array().safeParse(rows);

  if (!parsed.success) {
    console.error(
      '[parseUserInfoCsv] parseValidatedUsers: validation failed',
      parsed.error
    );
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
 * @throws When any Put fails (failures logged, then thrown as `Error` with JSON message)
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
    console.error(
      '[parseUserInfoCsv] saveUserData: DynamoDB Put failures',
      failures
    );
    throw new Error(JSON.stringify(failures, null, 2));
  }
}

/**
 * @param event - `USER_INFO_CSV` (full CSV text) and `DDB_TABLE`.
 * @throws On PapaParse errors, Zod validation failure, or any DynamoDB `PutItem` failure (errors logged then thrown as `Error` with JSON payload where applicable).
 */
export const handler: Handler<EventInput> = async (event) => {
  const rows = parseUserCsvRows(event.USER_INFO_CSV ?? '');
  const users = parseValidatedUsers(rows);
  const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  await saveUserData(ddbClient, event.DDB_TABLE, users);
};
