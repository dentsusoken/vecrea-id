import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { customProvider } from "./providers/custom-provider";

function tryGetOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const devTrustedOrigins =
  process.env.NODE_ENV === "development"
    ? ([
        "exp://",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19000",
        "http://127.0.0.1:19000",
      ] as const)
    : ([] as const);

/**
 * Expo Router API routes may not receive `BETTER_AUTH_URL` in `process.env` the same
 * way as the Metro client. If `baseURL` is missing, Better Auth infers it from the
 * request Host (e.g. `100.64.x.x:8081`), which breaks OAuth `redirect_uri` when you
 * want `localhost`. Always resolve a concrete string.
 */
const resolvedBaseURL =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim() ||
  "http://localhost:8081";

const envOrigins = [
  tryGetOrigin(process.env.BETTER_AUTH_URL),
  tryGetOrigin(process.env.EXPO_PUBLIC_BETTER_AUTH_URL),
  tryGetOrigin(resolvedBaseURL),
].filter(Boolean) as string[];

/**
 * Better Auth instance for Expo Router API routes. Generic OAuth only
 * (`custom` provider via {@link customProvider}) plus {@link expo} for native.
 */
export const auth = betterAuth({
  baseURL: resolvedBaseURL,
  trustedOrigins: ["id-integration-demo-expo://", ...devTrustedOrigins, ...envOrigins],
  advanced: {
    useSecureCookies: Boolean(resolvedBaseURL.startsWith("https")),
  },
  // Keep cookies small on native OAuth callbacks.
  // The Expo plugin URL-encodes `Set-Cookie` into `?cookie=...`; long values can exceed
  // Android intent/url limits, especially across repeated sign-in flows.
  session: {
    cookieCache: {
      enabled: true,
      strategy: "compact",
      // Keep cache cookie short-lived; the canonical session is still the session_token.
      maxAge: 60,
    },
  },
  account: {
    storeAccountCookie: false,
  },
  plugins: [expo(), customProvider],
});
