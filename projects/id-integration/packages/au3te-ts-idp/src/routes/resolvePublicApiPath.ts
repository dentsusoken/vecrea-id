import type { Context } from 'hono';
import { getIdpConfigRecord } from '../config/getIdpConfigRecord';

/**
 * Same merge as {@link readAu3teApiClientConfig}: Lambda/env + Secrets Manager JSON.
 * Use to fix links when API Gateway HTTP API v2 sends `rawPath` without the stage segment.
 *
 * Must start with `/` (e.g. `/prod`). No trailing slash.
 */
export const AU3TE_PUBLIC_PATH_PREFIX_ENV = 'AU3TE_PUBLIC_PATH_PREFIX' as const;

function normalizePrefix(p: string): string {
  const t = p.trim();
  if (t === '') return '';
  const withSlash = t.startsWith('/') ? t : `/${t}`;
  return withSlash.replace(/\/$/, '') || '';
}

/**
 * Returns the path segments before the first `/api/` in the pathname
 * (e.g. API Gateway stage `/prod` for `/prod/api/authorization`).
 */
export function computePathPrefixBeforeApi(pathname: string): string {
  const n = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const idx = n.indexOf('/api/');
  if (idx <= 0) return '';
  return n.slice(0, idx);
}

/** HTTP API v2: `rawPath` often omits stage; it is only in `requestContext.stage`. */
function inferApiGatewayStagePrefix(c: Context): string {
  const env = c.env as { event?: { requestContext?: { stage?: string } } } | undefined;
  const stage = env?.event?.requestContext?.stage;
  if (stage == null || stage === '' || stage === '$default') {
    return '';
  }
  return `/${stage}`;
}

function getOptionalConfiguredPublicPrefix(c: Context): string | undefined {
  const raw = getIdpConfigRecord(c)[AU3TE_PUBLIC_PATH_PREFIX_ENV];
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const s = String(raw).trim();
  if (s === '') {
    return undefined;
  }
  return normalizePrefix(s);
}

/**
 * Prefix for public HTML links and form actions so they match the browser URL
 * (stage, custom base path, etc.).
 *
 * @param path - App route beginning with `/`, e.g. {@link AUTHORIZATION_DECISION_PATH}
 */
export function resolvePublicApiPath(c: Context, path: string): string {
  const configured = getOptionalConfiguredPublicPrefix(c);
  if (configured !== undefined) {
    return `${configured}${path}`;
  }
  const pathname = new URL(c.req.url).pathname;
  const fromPath = computePathPrefixBeforeApi(pathname);
  if (fromPath !== '') {
    return `${fromPath}${path}`;
  }
  const fromStage = inferApiGatewayStagePrefix(c);
  if (fromStage !== '') {
    return `${fromStage}${path}`;
  }
  const xf = normalizePrefix(c.req.header('x-forwarded-prefix') ?? '');
  return `${xf}${path}`;
}
