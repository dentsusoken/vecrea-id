/**
 * Normalizes a URL path prefix for mounting and OpenAPI `servers` / Scalar.
 *
 * @param basePath - e.g. `api/v1`, `/api/v1`, or `/` — trimmed, single leading slash, no trailing slash.
 * @returns `""` when omitted or root; otherwise a path like `/api/v1`.
 */
export function normalizeBasePath(basePath: string | undefined): string {
  if (basePath === undefined || basePath === '' || basePath === '/') {
    return '';
  }
  let p = basePath.trim();
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  if (p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}
