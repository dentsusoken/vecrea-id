/**
 * API Gateway HTTP API v2 などで `rawPath` にステージが含まれない場合でも、
 * Scalar / OpenAPI `servers` / ランディングのリンクがブラウザ URL と一致するようにパスを組み立てる。
 *
 * au3te-ts-idp の `resolvePublicApiPath` と同様の優先順位（設定 → URL 推定 → stage → X-Forwarded-Prefix）。
 */

import type { Context } from 'hono';
import { normalizeBasePath } from './basePath';

/** IdP と共通の Secrets / Lambda 環境変数キー（埋め込み運用向け）。 */
export const AU3TE_PUBLIC_PATH_PREFIX_ENV = 'AU3TE_PUBLIC_PATH_PREFIX' as const;

/** 単体デプロイ用の任意キー。 */
export const USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV =
  'USER_MANAGEMENT_PUBLIC_PATH_PREFIX' as const;

const PUBLIC_PREFIX_ENV_KEYS = [
  AU3TE_PUBLIC_PATH_PREFIX_ENV,
  USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV,
] as const;

export type GetManagementEnv = (c: Context) => Record<string, unknown>;

export function normalizePublicPrefix(p: string): string {
  const t = p.trim();
  if (t === '') return '';
  const withSlash = t.startsWith('/') ? t : `/${t}`;
  return withSlash.replace(/\/$/, '') || '';
}

/**
 * パス名からマウント直前までの接頭辞を取り出す（例: `/prod/manage/...` と `/manage` → `/prod`）。
 */
export function computePathPrefixBeforeMount(
  pathname: string,
  mountPath: string
): string {
  const m = normalizeBasePath(mountPath);
  if (m === '') return '';
  const n = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(.+)${escaped}(?:/|$)`);
  const match = n.match(re);
  if (match) return match[1];
  return '';
}

/** HTTP API v2: `rawPath` にステージが無く `requestContext.stage` にだけあることがある。 */
function inferApiGatewayStagePrefix(c: Context): string {
  const env = c.env as { event?: { requestContext?: { stage?: string } } } | undefined;
  const stage = env?.event?.requestContext?.stage;
  if (stage == null || stage === '' || stage === '$default') {
    return '';
  }
  return `/${stage}`;
}

function readConfiguredPublicPrefix(
  c: Context,
  getEnv?: GetManagementEnv
): string | undefined {
  const fromBinding = getEnv?.(c);
  for (const key of PUBLIC_PREFIX_ENV_KEYS) {
    const raw =
      fromBinding?.[key] ??
      (typeof process !== 'undefined' ? process.env[key] : undefined);
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      return normalizePublicPrefix(String(raw));
    }
  }
  return undefined;
}

export type ResolvePublicMountOptions = {
  getEnv?: GetManagementEnv;
};

/**
 * マウントより手前の公開パス接頭辞（ステージやカスタムベース）。
 * 例: `/prod` 。
 */
export function resolvePublicPathPrefix(
  c: Context,
  mountPath: string,
  options?: ResolvePublicMountOptions
): string {
  const configured = readConfiguredPublicPrefix(c, options?.getEnv);
  if (configured !== undefined) {
    return configured;
  }
  const m = normalizeBasePath(mountPath);
  const pathname = new URL(c.req.url).pathname;
  const fromPath = computePathPrefixBeforeMount(pathname, m);
  if (fromPath !== '') {
    return fromPath;
  }
  const fromStage = inferApiGatewayStagePrefix(c);
  if (fromStage !== '') {
    return fromStage;
  }
  return normalizePublicPrefix(c.req.header('x-forwarded-prefix') ?? '');
}

/**
 * OpenAPI `servers[].url` やベース URL 用（マウント込みの絶対パス）。
 * 例: `mountPath=/manage` かつステージ `prod` → `/prod/manage`。
 */
export function resolvePublicServersPath(
  c: Context,
  mountPath: string | undefined,
  options?: ResolvePublicMountOptions
): string {
  const m = normalizeBasePath(mountPath);
  const pre = resolvePublicPathPrefix(c, m, options);
  if (pre === '' && m === '') {
    return '/';
  }
  if (pre === '') {
    return m || '/';
  }
  if (m === '') {
    return pre;
  }
  return `${pre}${m}`;
}

/** ブラウザから取得する OpenAPI JSON のパス（先頭 `/`）。 */
export function resolvePublicOpenApiJsonPath(
  c: Context,
  mountPath: string | undefined,
  options?: ResolvePublicMountOptions
): string {
  const m = normalizeBasePath(mountPath);
  const suffix = m === '' ? '/openapi.json' : `${m}/openapi.json`;
  const pre = resolvePublicPathPrefix(c, m, options);
  if (pre === '') {
    return suffix;
  }
  return `${pre}${suffix}`;
}

/** Scalar UI へのパス。 */
export function resolvePublicDocsPath(
  c: Context,
  mountPath: string | undefined,
  options?: ResolvePublicMountOptions
): string {
  const m = normalizeBasePath(mountPath);
  const suffix = m === '' ? '/docs' : `${m}/docs`;
  const pre = resolvePublicPathPrefix(c, m, options);
  if (pre === '') {
    return suffix;
  }
  return `${pre}${suffix}`;
}

export function buildLandingPageText(
  c: Context,
  mountPath: string | undefined,
  options?: ResolvePublicMountOptions
): string {
  const openApi = resolvePublicOpenApiJsonPath(c, mountPath, options);
  const docs = resolvePublicDocsPath(c, mountPath, options);
  return `User Management API — OpenAPI: ${openApi}, Scalar: ${docs}`;
}
