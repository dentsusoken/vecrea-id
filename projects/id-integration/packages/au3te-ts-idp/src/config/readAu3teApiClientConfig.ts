import type { AuthleteConfiguration } from '@vecrea/au3te-ts-common/conf';
import type { Context } from 'hono';
import { getIdpConfigRecord } from './getIdpConfigRecord';
import { resolveEnvRuntime } from './resolveEnvRuntime';

/** Authlete / au3te API クライアント用の環境変数名 */
export const AU3TE_ENV = {
  API_VERSION: 'AU3TE_API_VERSION',
  BASE_URL: 'AU3TE_API_BASE_URL',
  SERVICE_API_KEY: 'AU3TE_SERVICE_API_KEY',
  SERVICE_ACCESS_TOKEN: 'AU3TE_SERVICE_ACCESS_TOKEN',
} as const;

/**
 * Hono の `env`（`hono/adapter`）でランタイム差を吸収して環境変数を読む。
 * - Node / Bun / edge-light: `process.env`
 * - Deno: `Deno.env`
 * - Cloudflare Workers: `c.env`（Bindings）— リクエスト文脈が必要なため `c` を渡すこと
 *
 * @see https://hono.dev/docs/helpers/adapter
 */
export function readAu3teApiClientConfig(
  c?: Context
): AuthleteConfiguration {
  const runtime = resolveEnvRuntime();
  if (runtime === 'workerd' && c === undefined) {
    throw new Error(
      'Cloudflare Workers では Bindings を参照するため、ミドルウェア等で Context を渡して readAu3teApiClientConfig(c) を呼び出してください。'
    );
  }

  const record = getIdpConfigRecord(c);

  return {
    apiVersion: requireEnv(record, AU3TE_ENV.API_VERSION),
    baseUrl: requireEnv(record, AU3TE_ENV.BASE_URL),
    serviceApiKey: requireEnv(record, AU3TE_ENV.SERVICE_API_KEY),
    serviceAccessToken: requireEnv(record, AU3TE_ENV.SERVICE_ACCESS_TOKEN),
  };
}

function requireEnv(record: Record<string, unknown>, name: string): string {
  const raw = record[name];
  if (raw === undefined || raw === null || String(raw).length === 0) {
    throw new Error(`環境変数 ${name} が未設定です。`);
  }
  return String(raw);
}
