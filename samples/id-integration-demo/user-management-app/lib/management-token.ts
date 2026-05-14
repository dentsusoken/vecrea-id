import { getManagementServerEnv } from './env';

type CachedToken = {
  token: string;
  /** epoch ms when we should refresh */
  refreshAfterMs: number;
};

let cache: CachedToken | null = null;

const SKEW_MS = 60_000;

type TokenSuccess = {
  access_token: string;
  expires_in?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Client-credentials access token for upstream user-management-apis (cached in memory).
 */
export async function getManagementAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache !== null && now < cache.refreshAfterMs) {
    return cache.token;
  }

  const env = getManagementServerEnv();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.OAUTH_CLIENT_ID,
    client_secret: env.OAUTH_CLIENT_SECRET,
    scope: env.OAUTH_SCOPE,
  });

  const res = await fetch(env.OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Token endpoint returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`
    );
  }

  if (!res.ok || !isRecord(json) || typeof json.access_token !== 'string') {
    const desc =
      isRecord(json) && typeof json.error_description === 'string'
        ? json.error_description
        : text.slice(0, 500);
    throw new Error(`Token request failed (${res.status}): ${desc}`);
  }

  const parsed = json as TokenSuccess;
  const token = parsed.access_token;
  const expiresInSec =
    typeof parsed.expires_in === 'number' && Number.isFinite(parsed.expires_in)
      ? parsed.expires_in
      : 300;
  const refreshAfterMs = now + Math.max(30, expiresInSec) * 1000 - SKEW_MS;

  cache = { token, refreshAfterMs };
  return token;
}
