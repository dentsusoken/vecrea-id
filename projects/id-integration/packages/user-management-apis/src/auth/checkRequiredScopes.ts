import type { Context } from 'hono';

/**
 * When bearer introspection ran, `scopes` is set (possibly empty). If unset,
 * no scope gate applies (same process without introspection).
 *
 * @returns JSON 403 when required scopes are missing; otherwise `undefined`.
 */
export function requiredScopesResponse(
  c: Context,
  required: readonly string[]
): Response | undefined {
  if (required.length === 0) {
    return undefined;
  }
  const granted = c.get('scopes');
  if (granted === undefined) {
    return undefined;
  }
  const missing = required.filter((s) => !granted.includes(s));
  if (missing.length > 0) {
    return c.json(
      {
        message: 'Insufficient scope',
        requiredScopes: [...required],
        missingScopes: missing,
      },
      403
    );
  }
  return undefined;
}
