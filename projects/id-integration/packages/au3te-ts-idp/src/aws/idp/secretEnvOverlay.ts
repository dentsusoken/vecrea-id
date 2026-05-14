import { getSecretJson } from '../secrets-manager/getSecretJson';

/**
 * When set (e.g. on Lambda), JSON key/value pairs from this secret are merged
 * over process / Hono bindings (same keys as AU3TE_* env vars).
 */
export const AU3TE_IDP_SECRET_ARN_ENV = 'AU3TE_IDP_SECRET_ARN' as const;

let loadPromise: Promise<void> | undefined;
let loaded = false;
let overlay: Record<string, string> = {};

function coerceEnvStrings(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

/**
 * Loads {@link AU3TE_IDP_SECRET_ARN_ENV} once per process (Lambda cold start),
 * then caches stringified config entries for sync reads in Hono handlers.
 */
export async function ensureIdpSecretEnvLoaded(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const arn = process.env[AU3TE_IDP_SECRET_ARN_ENV]?.trim();
      if (!arn) {
        overlay = {};
        loaded = true;
        return;
      }
      const raw = await getSecretJson<Record<string, unknown>>(arn);
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(
          `IdP secret must be a JSON object (secret "${arn}").`
        );
      }
      overlay = coerceEnvStrings(raw);
      loaded = true;
    } catch (err) {
      loaded = false;
      throw err;
    } finally {
      loadPromise = undefined;
    }
  })();

  return loadPromise;
}

/** Mutable merge source: call {@link ensureIdpSecretEnvLoaded} before request handling. */
export function getIdpSecretEnvOverlay(): Readonly<Record<string, string>> {
  return overlay;
}

/** @internal tests / dev only */
export function resetIdpSecretEnvOverlayForTests(): void {
  loaded = false;
  overlay = {};
  loadPromise = undefined;
}
