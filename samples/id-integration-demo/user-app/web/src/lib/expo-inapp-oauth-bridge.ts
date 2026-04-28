/**
 * Expo のインナーブラウザで OAuth 中に `prompt=none` 失敗などで
 * `/sign-in?error=...` へ飛ばされると、クエリの `oauthCallback` が落ちる。
 * そのままだと次の `sign-in/oauth2` が `callbackURL=/page` になり Web の `/page` に留まるため、
 * 同一 WebView 内で `sessionStorage` に戻り URL を保持する。
 */

const STORAGE_OAUTH_RETURN = "id-integration-demo:expo-oauth-return-url";
const STORAGE_APP_HOME = "id-integration-demo:expo-app-home-url";

/** `Linking.createURL("/page")` 由来の戻り URL からデモルート (`/`) を推測する。 */
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

/** `/sign-in` をクエリなしで開いたときだけ古い Expo 用 URL を消す。 */
export function shouldClearPersistedExpoBridgeForSignInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  return !sp.get("oauthCallback") && !sp.get("error");
}
