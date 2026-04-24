/**
 * Parses a Cognito-format CSV, validates each row, and writes staging items to DynamoDB.
 *
 * Mirrors the flow of `cognito-user-import-functions/src/functions/parseUserInfoCsv.ts`
 * but returns a structured result instead of throwing on partial failures.
 */

import papa from 'papaparse';
import type { ParseError } from 'papaparse';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  cognitoImportDataSchema,
  type CognitoImportData,
} from '../../schemas/cognitoImportData';
import type { ImportUsersCsvResponse } from '../../schemas/user';

const isCsvTruthy = (value: string | undefined) =>
  value === 'true' || value === 'TRUE';

const isVerifiedUser = (user: CognitoImportData) =>
  isCsvTruthy(user.email_verified) ||
  isCsvTruthy(user.phone_number_verified);

/** UTF-8 BOM + Normalize newlines so PapaParse sees one `\n` per record. */
function normalizeCsvText(s: string): string {
  return s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Zip a header:false CSV row array to field names from row 0. */
function rowRecordFromArray(
  fields: string[],
  row: unknown[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let j = 0; j < fields.length; j++) {
    const v = row[j];
    if (v === undefined) continue;
    const key = fields[j]!;
    if (!key || key === '__parsed_extra') continue;
    out[key] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

/**
 * Cognito-style export: row 0 = column names, rest = values.
 * Uses `header: false` so we never hit PapaParse's `fillHeaderFields` bug where
 * if `data[0]` is not an array, it does `data.forEach(addHeader)` and pushes
 * each **data row** onto `meta.fields` (seen as trailing `[Array, ...]` and
 * `data: [undefined, ...]`).
 */
function parseCognitoUserExportToRecords(csvText: string): {
  records: Record<string, string>[];
  parseErrors: ParseError[];
} {
  const parseResult = papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const { data, errors: parseErrors } = parseResult;

  if (!Array.isArray(data)) {
    throw new Error('CSV parser returned non-array data; check file format');
  }

  if (data.length === 0) {
    return { records: [], parseErrors };
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

  const records: Record<string, string>[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i];
    if (!Array.isArray(cells)) {
      records.push({});
      continue;
    }
    records.push(rowRecordFromArray(fields, cells));
  }

  return { records, parseErrors };
}

/**
 * End-to-end CSV → DynamoDB staging pipeline.
 *
 * 1. PapaParse with `header: false`, row 0 = headers (avoids Papa header bug)
 * 2. Per-row validation via {@link cognitoImportDataSchema}
 * 3. Parallel `PutItem` for valid rows
 *
 * @returns Structured result with counts and per-row error details.
 * @throws Only on catastrophic PapaParse failure (empty / unparseable input).
 */
export async function importUsersCsvToStaging(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  csvText: string,
  options?: { importBatchId: string }
): Promise<ImportUsersCsvResponse> {
  const normalizedText = normalizeCsvText(csvText);
  const { records: rawData, parseErrors } =
    parseCognitoUserExportToRecords(normalizedText);

  if (parseErrors.length > 0 && rawData.length === 0) {
    throw new Error(
      `CSV parse failed: ${parseErrors.map((e) => e.message).join('; ')}`
    );
  }

  const totalRows = rawData.length;
  const errors: { row: number; message: string }[] = [];

  const validUsers: { index: number; user: CognitoImportData }[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const coerced = rawData[i]!;
    const parsed = cognitoImportDataSchema.safeParse(coerced);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(
        (iss) =>
          `${iss.path.length ? iss.path.join('.') + ': ' : ''}${iss.message}`
      );
      errors.push({ row: i + 1, message: messages.join('; ') });
    } else {
      validUsers.push({ index: i, user: parsed.data });
    }
  }

  if (parseErrors.length > 0) {
    console.warn(
      '[importUsersCsvToStaging] PapaParse errors (file may still have partial rows)',
      parseErrors
    );
  }

  const batchId = options?.importBatchId;

  const outcomes = await Promise.allSettled(
    validUsers.map(({ user }) =>
      ddb.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            id: user['cognito:username'],
            data: user,
            imported: false,
            verified: isVerifiedUser(user),
            ...(batchId !== undefined ? { importBatchId: batchId } : {}),
          },
        })
      )
    )
  );

  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i]!;
    if (outcome.status === 'rejected') {
      const { index, user } = validUsers[i]!;
      const reason =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
      errors.push({
        row: index + 1,
        message: `DynamoDB PutItem failed for ${user['cognito:username']}: ${reason}`,
      });
    }
  }

  const failureCount = errors.length;
  const successCount = totalRows - failureCount;

  return {
    totalRows,
    successCount,
    failureCount,
    ...(batchId !== undefined ? { importBatchId: batchId } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  };
}
