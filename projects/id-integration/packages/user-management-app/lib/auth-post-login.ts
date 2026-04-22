/** Cookie set before redirecting to `/api/auth/sign-in`; consumed by `/auth/continue`. */
export const AUTH_POST_LOGIN_COOKIE = 'auth_post_login_path';

/**
 * Only same-origin relative paths; blocks open redirects and auth-route loops.
 */
export function safePostLoginPath(raw: string | undefined): string {
  if (raw === undefined || raw === '') return '/users';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/users';
  if (raw.startsWith('/api/auth')) return '/users';
  return raw;
}
