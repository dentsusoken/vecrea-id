export type ManagementServerEnv = {
  USER_MANAGEMENT_API_BASE_URL: string;
  OAUTH_TOKEN_URL: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  OAUTH_SCOPE: string;
};

const KEYS: (keyof ManagementServerEnv)[] = [
  'USER_MANAGEMENT_API_BASE_URL',
  'OAUTH_TOKEN_URL',
  'OAUTH_CLIENT_ID',
  'OAUTH_CLIENT_SECRET',
  'OAUTH_SCOPE',
];

/**
 * Reads required BFF / upstream config. Throws if any value is missing or blank.
 */
export function getManagementServerEnv(): ManagementServerEnv {
  const out = {} as Partial<ManagementServerEnv>;
  for (const key of KEYS) {
    const raw = process.env[key];
    if (raw === undefined || String(raw).trim() === '') {
      throw new Error(`Missing or empty environment variable: ${key}`);
    }
    out[key] = String(raw).trim();
  }
  return out as ManagementServerEnv;
}
