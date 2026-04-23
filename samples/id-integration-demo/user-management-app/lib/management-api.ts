import { getManagementServerEnv } from './env';
import { getManagementAccessToken } from './management-token';

/**
 * Calls user-management-apis under {@link getManagementServerEnv}.USER_MANAGEMENT_API_BASE_URL
 * with a Bearer token from client-credentials flow.
 */
export async function managementApiFetch(
  pathAndQuery: string,
  init?: RequestInit
): Promise<Response> {
  const { USER_MANAGEMENT_API_BASE_URL } = getManagementServerEnv();
  const base = USER_MANAGEMENT_API_BASE_URL.replace(/\/$/, '');
  const suffix = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  const url = `${base}${suffix}`;
  const token = await getManagementAccessToken();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: 'no-store' });
}
