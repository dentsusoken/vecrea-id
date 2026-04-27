"use client";

import { useRouter } from "next/navigation";
import { useMemo, useEffect } from "react";

import { SignInButton } from "@/components/auth/SignInButton";
import { useSession } from "@/lib/auth-client";

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

function parseTrustedOauthCallback(raw: string | null): string | undefined {
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

/**
 * Sign-in UI: session redirect and OAuth button options (aligned with Expo
 * `app/(auth)/sign-in.tsx`).
 */
export function SignInContent({
  oauthCallback,
  error,
}: {
  oauthCallback: string | null;
  error: string | null;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const oauthCallbackURL = useMemo(
    () => parseTrustedOauthCallback(oauthCallback),
    [oauthCallback],
  );
  const shouldAutoInteractive = useMemo(
    () => (error ? OIDC_PROMPT_NONE_ERRORS.has(error) : false),
    [error],
  );

  useEffect(() => {
    if (isPending) return;
    if (session?.user && !oauthCallbackURL) {
      router.replace("/page");
    }
  }, [isPending, session?.user, oauthCallbackURL, router]);

  if (!isPending && session?.user && !oauthCallbackURL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700"
          aria-label="Redirecting"
        />
      </div>
    );
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

        <div className="flex justify-center">
          <SignInButton
            oauthCallbackURL={oauthCallbackURL}
            startMode={shouldAutoInteractive ? "interactive" : "silent"}
            autoStart={shouldAutoInteractive}
          />
        </div>
      </div>
    </div>
  );
}
