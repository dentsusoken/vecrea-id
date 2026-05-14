/**
 * During Expo in-app-browser OAuth, an IdP can reject `prompt=none` and trigger
 * a redirect to `/sign-in?error=...`, which drops the `oauthCallback` query.
 *
 * Without that deep link, the next `sign-in/oauth2` falls back to `callbackURL=/page`
 * and the flow stays in the WebView. Persist the trusted return URL in
 * `sessionStorage` so we can restore it within the same WebView session.
 */

const STORAGE_OAUTH_RETURN = "id-integration-demo:expo-oauth-return-url";
const STORAGE_APP_HOME = "id-integration-demo:expo-app-home-url";

/** Infer the demo root (`/`) from `Linking.createURL("/page")`-style return URLs. */
export function inferAppHomeFromOAuthReturn(returnUrl: string): string | undefined {
  if (returnUrl.includes("--/page")) {
    return returnUrl.replace("--/page", "--/");
  }
  const m = returnUrl.match(/\/page(?=\?|#|$)/);
  if (!m || m.index === undefined) return undefined;
  return (
    returnUrl.slice(0, m.index) + "/" + returnUrl.slice(m.index + "/page".length)
  );
}

export function persistExpoInappOAuthBridge(
  oauthReturnUrl: string,
  appHomeUrl?: string,
): void {
  try {
    sessionStorage.setItem(STORAGE_OAUTH_RETURN, oauthReturnUrl);
    const home = appHomeUrl ?? inferAppHomeFromOAuthReturn(oauthReturnUrl);
    if (home) sessionStorage.setItem(STORAGE_APP_HOME, home);
  } catch {
    /* private mode / quota */
  }
}

export function readPersistedExpoOauthReturnUrl(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_OAUTH_RETURN);
  } catch {
    return null;
  }
}

export function readPersistedExpoAppHomeUrl(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_APP_HOME);
  } catch {
    return null;
  }
}

export function clearPersistedExpoInappOAuthBridge(): void {
  try {
    sessionStorage.removeItem(STORAGE_OAUTH_RETURN);
    sessionStorage.removeItem(STORAGE_APP_HOME);
  } catch {
    /* ignore */
  }
}

/** Clear persisted values only when `/sign-in` is opened without query params. */
export function shouldClearPersistedExpoBridgeForSignInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  return !sp.get("oauthCallback") && !sp.get("error");
}
