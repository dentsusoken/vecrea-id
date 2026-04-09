/**
 * Parses a Cognito-format CSV, validates each row, and writes staging items to DynamoDB.
 *
 * Mirrors the flow of `cognito-user-import-functions/src/functions/parseUserInfoCsv.ts`
 * but returns a structured result instead of throwing on partial failures.
 */

import papa from 'papaparse';
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

/**
 * End-to-end CSV → DynamoDB staging pipeline.
 *
 * 1. PapaParse with `header: true`
 * 2. Per-row validation via {@link cognitoImportDataSchema}
 * 3. Parallel `PutItem` for valid rows
 *
 * @returns Structured result with counts and per-row error details.
 * @throws Only on catastrophic PapaParse failure (empty / unparseable input).
 */
export async function importUsersCsvToStaging(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  csvText: string
): Promise<ImportUsersCsvResponse> {
  const { data: rows, errors: parseErrors } = papa.parse<Record<string, string>>(
    csvText,
    { header: true, skipEmptyLines: true }
  );

  if (parseErrors.length > 0 && rows.length === 0) {
    throw new Error(
      `CSV parse failed: ${parseErrors.map((e) => e.message).join('; ')}`
    );
  }

  const totalRows = rows.length;
  const errors: { row: number; message: string }[] = [];

  const validUsers: { index: number; user: CognitoImportData }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = cognitoImportDataSchema.safeParse(rows[i]);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(
        (iss) => `${iss.path.join('.')}: ${iss.message}`
      );
      errors.push({ row: i + 1, message: messages.join('; ') });
    } else {
      validUsers.push({ index: i, user: parsed.data });
    }
  }

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
    ...(errors.length > 0 ? { errors } : {}),
  };
}
