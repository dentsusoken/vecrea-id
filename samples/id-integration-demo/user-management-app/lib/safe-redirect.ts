/**
 * Prevents open redirects: only same-app absolute paths.
 */
export function safeAppRedirectPath(
  raw: string | null | undefined,
  fallback = '/users'
): string {
  if (raw == null || raw === '') return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}
