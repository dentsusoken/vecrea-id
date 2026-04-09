import {
  federationRegistrySchema,
  type FederationRegistry,
} from '@vecrea/au3te-ts-common/schemas.federation';
import type { Context } from 'hono';
import { getIdpConfigRecord } from './getIdpConfigRecord';
import { resolveEnvRuntime } from './resolveEnvRuntime';

/** 連携 IdP レジストリ（JSON）。省略時は空の `federations` */
export const AU3TE_FEDERATION_ENV = {
  REGISTRY_JSON: 'AU3TE_FEDERATION_REGISTRY',
  /** `true` / `false`。省略時は `NODE_ENV === 'production'` なら false、それ以外は true */
  IS_DEV: 'AU3TE_FEDERATION_DEV',
} as const;

/**
 * `AU3TE_FEDERATION_REGISTRY` の JSON を {@link federationRegistrySchema} で検証する。
 * 未設定・空文字のときは `{ federations: [] }`。
 *
 * Workers では `c.env` が必要なため `c` を渡すこと（{@link readAu3teApiClientConfig} と同様）。
 */
export function readFederationRegistry(c?: Context): FederationRegistry {
  const runtime = resolveEnvRuntime();
  if (runtime === 'workerd' && c === undefined) {
    throw new Error(
      'Cloudflare Workers では readFederationRegistry(c) に Context を渡してください。'
    );
  }

  const record = getIdpConfigRecord(c);

  const raw = record[AU3TE_FEDERATION_ENV.REGISTRY_JSON];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return federationRegistrySchema.parse({ federations: [] });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    throw new Error(
      `${AU3TE_FEDERATION_ENV.REGISTRY_JSON} は有効な JSON 文字列である必要があります。`
    );
  }

  return federationRegistrySchema.parse(parsed);
}

/** {@link AU3TE_FEDERATION_ENV.IS_DEV} および `NODE_ENV` から OIDC 連携の dev フラグを決める */
export function readFederationIsDev(c?: Context): boolean {
  const runtime = resolveEnvRuntime();
  if (runtime === 'workerd' && c === undefined) {
    throw new Error(
      'Cloudflare Workers では readFederationIsDev(c) に Context を渡してください。'
    );
  }

  const record = getIdpConfigRecord(c);

  const v = record[AU3TE_FEDERATION_ENV.IS_DEV];
  if (v === true || v === 'true' || v === '1') {
    return true;
  }
  if (v === false || v === 'false' || v === '0') {
    return false;
  }
  if (
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.env?.NODE_ENV === 'production'
  ) {
    return false;
  }
  return true;
}
