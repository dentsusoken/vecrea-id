/**
 * Paginated DynamoDB Scan of the user-import staging table with sanitized `data`.
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const DEFAULT_LIMIT = 25;

export type StagingUserSummary = {
  id: string;
  imported: boolean;
  verified: boolean;
  error?: string;
  errorMessage?: string;
  data: Record<string, unknown>;
};

/**
 * Removes secrets from staging `Item.data` for API responses.
 */
export function sanitizeStagingData(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }
  const row = data as Record<string, unknown>;
  const { password_hash: _omit, ...rest } = row;
  return rest;
}

function mapRawItem(item: Record<string, unknown>): StagingUserSummary {
  const summary: StagingUserSummary = {
    id: item.id != null ? String(item.id) : '',
    imported: item.imported === true,
    verified: item.verified === true,
    data: sanitizeStagingData(item.data),
  };
  if (typeof item.error === 'string' && item.error !== '') {
    summary.error = item.error;
  }
  if (typeof item.errorMessage === 'string' && item.errorMessage !== '') {
    summary.errorMessage = item.errorMessage;
  }
  return summary;
}

/**
 * @throws Error with message `Invalid paginationToken` when token cannot be decoded.
 */
export function decodeStagingPaginationToken(
  token: string | undefined
): Record<string, unknown> | undefined {
  if (token === undefined || token === '') {
    return undefined;
  }
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid paginationToken');
  }
}

export function encodeStagingPaginationToken(
  key: Record<string, unknown> | undefined
): string | undefined {
  if (key === undefined || Object.keys(key).length === 0) {
    return undefined;
  }
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

/**
 * One page of staging rows. Uses DynamoDB Scan (operator tooling — avoid high-frequency polling).
 */
export async function listStagingUsers(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  query: { limit?: number; paginationToken?: string }
): Promise<{ items: StagingUserSummary[]; paginationToken?: string }> {
  const limit = query.limit ?? DEFAULT_LIMIT;
  const exclusiveStartKey = decodeStagingPaginationToken(query.paginationToken);

  const out = await ddb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: limit,
      ...(exclusiveStartKey !== undefined
        ? { ExclusiveStartKey: exclusiveStartKey }
        : {}),
    })
  );

  const items = (out.Items ?? []).map((item) =>
    mapRawItem(item as Record<string, unknown>)
  );

  return {
    items,
    paginationToken: encodeStagingPaginationToken(
      out.LastEvaluatedKey as Record<string, unknown> | undefined
    ),
  };
}
