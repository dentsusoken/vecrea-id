import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { customProvider } from "@/lib/providers/custom-provider";

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
        "http://localhost:19000",
        "http://127.0.0.1:19000",
        // This Next.js app (local)
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ] as const)
    : ([] as const);

/**
 * Next.js may not receive `BETTER_AUTH_URL` in all build contexts. If `baseURL` is
 * missing, Better Auth infers it from the request Host, which can break OAuth
 * `redirect_uri` when you want a stable public URL. Always resolve a concrete string
 * (same idea as `EXPO_PUBLIC_BETTER_AUTH_URL` in the Expo demo).
 */
const resolvedBaseURL =
  process.env.BETTER_AUTH_URL?.trim() ||
  "http://localhost:3000";

const envOrigins = [
  tryGetOrigin(process.env.BETTER_AUTH_URL),
  tryGetOrigin(resolvedBaseURL),
].filter(Boolean) as string[];

/**
 * Better Auth instance for Next.js `/api/auth/*`. Generic OAuth only
 * (`custom` via {@link customProvider}). The Expo app shares the same OAuth/session
 * tuning but adds the `@better-auth/expo` plugin for native handoff.
 */
export const auth = betterAuth({
  baseURL: resolvedBaseURL,
  trustedOrigins: ["id-integration-demo-expo://", ...devTrustedOrigins, ...envOrigins],
  onAPIError: {
    // Avoid showing Better Auth's default error page in awkward browser states.
    //
    // NOTE: For Generic OAuth, callback errors that come back as `?error=...` are
    // redirected to `onAPIError.errorURL` (not to `errorCallbackURL`).
    //
    // Keep this as HTTP(S) so web browsers never attempt to open `exp://...`.
    errorURL: `${resolvedBaseURL}/sign-in`,
  },
  // advanced: {
  //   useSecureCookies: Boolean(resolvedBaseURL.startsWith("https")),
  // },
  // Keep cookies small on OAuth callbacks (same compact cache strategy as Expo).
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
