import { env } from 'hono/adapter';
import type { Context } from 'hono';
import { getIdpSecretEnvOverlay } from '../aws/idp/secretEnvOverlay';
import { resolveEnvRuntime } from './resolveEnvRuntime';

/**
 * Bindings / process env merged with Secrets Manager overlay (if loaded).
 * Secret values win on key collision.
 */
export function getIdpConfigRecord(c?: Context): Record<string, unknown> {
  const runtime = resolveEnvRuntime();
  const base = env(
    (c ?? ({} as Context)) as Context,
    runtime
  ) as Record<string, unknown>;
  const fromSm = getIdpSecretEnvOverlay();
  return { ...base, ...fromSm };
}
