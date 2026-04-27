const enabled = process.env.NODE_ENV === "development";

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
