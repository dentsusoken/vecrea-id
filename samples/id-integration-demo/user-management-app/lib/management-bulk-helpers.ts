import type { ListStagingUsersResponse } from '@/types/staging';
import type { ListUsersResponse } from '@/types/user';

const USER_LIST_LIMIT = 60;
const STAGING_LIST_LIMIT = 100;
export const BATCH_DELETE_CHUNK = 100;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Fetches all Cognito usernames the management API can list (paged with `ListUsers`).
 */
export async function fetchAllUsernames(): Promise<string[]> {
  const usernames: string[] = [];
  let paginationToken: string | undefined;

  for (;;) {
    const qs = new URLSearchParams();
    qs.set('limit', String(USER_LIST_LIMIT));
    if (paginationToken) qs.set('paginationToken', paginationToken);
    const res = await fetch(`/api/users?${qs.toString()}`);
    const text = await res.text();
    if (!res.ok) {
      let message = text || res.statusText;
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j.message) message = j.message;
      } catch {
        /* keep message */
      }
      throw new Error(message);
    }
    const data = JSON.parse(text) as ListUsersResponse;
    for (const u of data.items) {
      usernames.push(u.username);
    }
    paginationToken = data.paginationToken;
    if (paginationToken === undefined || paginationToken === '') {
      break;
    }
  }

  return usernames;
}

/**
 * Fetches all staging table primary keys (paged `Scan` via the management API).
 */
export async function fetchAllStagingIds(): Promise<string[]> {
  const ids: string[] = [];
  let paginationToken: string | undefined;

  for (;;) {
    const qs = new URLSearchParams();
    qs.set('limit', String(STAGING_LIST_LIMIT));
    if (paginationToken) qs.set('paginationToken', paginationToken);
    const res = await fetch(`/api/staging/users?${qs.toString()}`);
    const text = await res.text();
    if (!res.ok) {
      let message = text || res.statusText;
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j.message) message = j.message;
      } catch {
        /* keep message */
      }
      throw new Error(message);
    }
    const data = JSON.parse(text) as ListStagingUsersResponse;
    for (const row of data.items) {
      ids.push(row.id);
    }
    paginationToken = data.paginationToken;
    if (paginationToken === undefined || paginationToken === '') {
      break;
    }
  }

  return ids;
}
