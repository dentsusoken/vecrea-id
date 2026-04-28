import { SignInBackToHome } from "@/components/auth/SignInBackToHome";
import { SignInButton } from "@/components/auth/SignInButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const APP_SCHEME = "id-integration-demo-expo:";
const OIDC_PROMPT_NONE_ERRORS = new Set([
  "login_required",
  "interaction_required",
  "consent_required",
  "account_selection_required",
]);

function isExpoGoCallbackUrl(url: string): boolean {
  if (url.startsWith("exp://")) return true;
  return /^exp\+[^:]+:\/\//.test(url);
}

function parseTrustedAppDeepLink(raw: string | null): string | undefined {
  if (!raw) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  if (!decoded.startsWith(APP_SCHEME) && !isExpoGoCallbackUrl(decoded))
    return undefined;
  return decoded;
}

/** `Linking.createURL("/page")` 由来の戻り URL からデモルート (`/`) を推測する。 */
function inferAppHomeFromOAuthReturn(returnUrl: string): string | undefined {
  if (returnUrl.includes("--/page")) {
    return returnUrl.replace("--/page", "--/");
  }
  const m = returnUrl.match(/\/page(?=\?|#|$)/);
  if (!m || m.index === undefined) return undefined;
  return (
    returnUrl.slice(0, m.index) + "/" + returnUrl.slice(m.index + "/page".length)
  );
}

/**
 * Sign-in UI (SSR): redirects when already signed in, otherwise renders a card
 * with a client-side `SignInButton`.
 */
export async function SignInContent({
  oauthCallback,
  appHomeCallback,
  error,
}: {
  oauthCallback: string | null;
  appHomeCallback: string | null;
  error: string | null;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const oauthCallbackURL = parseTrustedAppDeepLink(oauthCallback);
  const appHomeDeepLink = parseTrustedAppDeepLink(appHomeCallback);
  const resolvedAppHomeHref =
    appHomeDeepLink ??
    (oauthCallbackURL
      ? inferAppHomeFromOAuthReturn(oauthCallbackURL)
      : undefined);
  const shouldAutoInteractive = error
    ? OIDC_PROMPT_NONE_ERRORS.has(error)
    : false;

  // Web UX: if already signed in, skip the sign-in screen and go straight to /page.
  // If `oauthCallback` is present, we intentionally keep showing the sign-in page
  // (mirrors the Expo behavior when running sign-in in an in-app browser).
  if (session?.user && !oauthCallbackURL) {
    redirect("/page");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600">
            Continue with your identity provider to access protected pages in
            this demo.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex justify-center">
            <SignInButton
              oauthCallbackURL={oauthCallbackURL}
              startMode={shouldAutoInteractive ? "interactive" : "silent"}
              autoStart={shouldAutoInteractive}
            />
          </div>
          {oauthCallbackURL ? (
            resolvedAppHomeHref ? (
              <SignInBackToHome mode="app" href={resolvedAppHomeHref} />
            ) : null
          ) : (
            <SignInBackToHome mode="web" />
          )}
        </div>
      </div>
    </div>
  );
}
