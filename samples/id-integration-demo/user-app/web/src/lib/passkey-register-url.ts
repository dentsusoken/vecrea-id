/**
 * Builds the Cognito Hosted UI passkey registration URL:
 * `https://<cognito-host>/passkeys/add?client_id=...&redirect_uri=...`
 */

function truthyEnv(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function trimEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

/** When true, the after-sign-in page may show a link to Cognito passkey registration. */
export function shouldShowPasskeyRegisterLink(): boolean {
  return truthyEnv(trimEnv("SHOW_PASSKEY_REGISTER_LINK"));
}

/**
 * Base URL (domain or origin) for managed login passkey registration.
 * Example: `myapp.auth.ap-northeast-1.amazoncognito.com` or
 * `https://myapp.auth.ap-northeast-1.amazoncognito.com`.
 */
function passkeyRegisterBaseUrlFromEnv(): string | undefined {
  const raw = trimEnv("PASSKEY_REGISTER_LINK");
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

function defaultRedirectUri(): string | undefined {
  const explicit = trimEnv("PASSKEY_REGISTER_REDIRECT_URI");
  if (explicit) return explicit;
  const base = trimEnv("BETTER_AUTH_URL");
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/page`;
}

/** Returns the full passkey registration URL, or `null` if misconfigured or disabled. */
export function buildPasskeyRegisterUrl(): string | null {
  if (!shouldShowPasskeyRegisterLink()) return null;

  const clientId = trimEnv("PASSKEY_REGISTER_CLIENT_ID");
  const base = passkeyRegisterBaseUrlFromEnv();
  const redirectUri = defaultRedirectUri();
  if (!clientId || !base || !redirectUri) return null;

  try {
    const url = new URL(`${base}/passkeys/add`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    return url.toString();
  } catch {
    return null;
  }
}
