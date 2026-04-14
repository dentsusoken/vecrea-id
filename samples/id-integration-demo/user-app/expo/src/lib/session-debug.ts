const enabled = typeof __DEV__ !== "undefined" && __DEV__;

/**
 * Development-only logs for Better Auth / session troubleshooting.
 */
export function logAuthSession(
  tag: string,
  payload: Record<string, unknown>,
): void {
  if (!enabled) return;
  console.log(`[auth/session] ${tag}`, payload);
}
