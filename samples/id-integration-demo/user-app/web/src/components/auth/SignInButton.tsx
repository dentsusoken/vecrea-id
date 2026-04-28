"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { authClient, signIn, useSession } from "@/lib/auth-client";
import {
  clearPersistedExpoInappOAuthBridge,
  persistExpoInappOAuthBridge,
  readPersistedExpoOauthReturnUrl,
  shouldClearPersistedExpoBridgeForSignInUrl,
} from "@/lib/expo-inapp-oauth-bridge";
import { logAuthSession } from "@/lib/session-debug";

const buttonClassName =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:opacity-70";

/** Prevents overlapping OAuth starts across remounts / double-click. */
let oauth2StartInFlight = false;

function now() {
  return new Date().toISOString();
}

function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  if (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    e.name === "AbortError"
  )
    return true;
  const message = e instanceof Error ? e.message : String(e);
  return message.toLowerCase().includes("abort");
}

type Oauth2SignInResult = Awaited<ReturnType<typeof signIn.oauth2>>;

function isOauth2ErrorResult(res: Oauth2SignInResult): boolean {
  return res.error != null;
}

function sessionDataHasUser(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "user" in data &&
    (data as { user: unknown }).user != null
  );
}

function sessionUserFromAuthStore(): unknown {
  type SessionAtomSnapshot = { data?: unknown };
  const snap = authClient.$store.atoms.session.get() as SessionAtomSnapshot;
  return snap?.data ?? null;
}

async function signInCustomWithPromptNoneFallback(options: {
  hasUserAfterRefetch: () => Promise<boolean>;
  callbackURL?: string;
  startMode?: "silent" | "interactive";
}): Promise<Oauth2SignInResult> {
  const base = {
    providerId: "custom" as const,
    callbackURL: options.callbackURL ?? "/page",
  };

  if (options.startMode === "interactive") {
    return signIn.oauth2({ ...base });
  }

  let silent: Oauth2SignInResult;
  try {
    silent = await signIn.oauth2({
      ...base,
      additionalData: { prompt: "none" },
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    logAuthSession("SIGNIN_FLOW:fallback", {
      at: now(),
      reason: "silent_throw",
    });
    return signIn.oauth2({ ...base });
  }

  if (isOauth2ErrorResult(silent)) {
    logAuthSession("SIGNIN_FLOW:fallback", {
      at: now(),
      reason: "silent_error_result",
    });
    return signIn.oauth2({ ...base });
  }

  const hasUser = await options.hasUserAfterRefetch();
  if (hasUser) return silent;

  logAuthSession("SIGNIN_FLOW:fallback", {
    at: now(),
    reason: "no_user_after_silent",
  });
  return signIn.oauth2({ ...base });
}

function oauth2ErrorMessage(err: Oauth2SignInResult["error"]): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return String(err);
}

export type SignInButtonProps = {
  /**
   * OAuth post-sign-in URL. When non-http(s) (e.g. app deep link), skip
   * `router.replace("/page")` after success — the host handles navigation.
   */
  oauthCallbackURL?: string;
  /** Expo app-home URL (persisted in `sessionStorage` alongside `oauthCallbackURL`). */
  expoAppHomeForStorage?: string;
  startMode?: "silent" | "interactive";
  autoStart?: boolean;
};

export function SignInButton({
  oauthCallbackURL,
  expoAppHomeForStorage,
  startMode = "silent",
  autoStart = false,
}: SignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [expoOauthReturnUrl, setExpoOauthReturnUrl] = useState<
    string | undefined
  >(oauthCallbackURL);
  const expoReturnRef = useRef(expoOauthReturnUrl);
  const router = useRouter();
  const { data: session, refetch } = useSession();
  const sessionRef = useRef(session);
  const autoStartRanRef = useRef(false);

  expoReturnRef.current = expoOauthReturnUrl;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldClearPersistedExpoBridgeForSignInUrl()) {
      clearPersistedExpoInappOAuthBridge();
      setExpoOauthReturnUrl(undefined);
      return;
    }
    if (oauthCallbackURL) {
      setExpoOauthReturnUrl(oauthCallbackURL);
      persistExpoInappOAuthBridge(oauthCallbackURL, expoAppHomeForStorage);
      return;
    }
    const stored = readPersistedExpoOauthReturnUrl();
    if (stored) setExpoOauthReturnUrl(stored);
  }, [oauthCallbackURL, expoAppHomeForStorage]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  async function hasUserAfterRefetch(): Promise<boolean> {
    await refetch();
    if (sessionDataHasUser(sessionUserFromAuthStore())) return true;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 48));
      if (sessionDataHasUser(sessionUserFromAuthStore())) return true;
    }
    return sessionDataHasUser(sessionUserFromAuthStore());
  }

  async function refetchAndWaitForSessionPropagation() {
    await refetch();
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
      if (sessionRef.current !== session) break;
    }
  }

  async function runSignInFlow() {
    const effectiveExpoReturn = expoReturnRef.current;
    const callbackURL = effectiveExpoReturn ?? "/page";
    const result = await signInCustomWithPromptNoneFallback({
      hasUserAfterRefetch,
      callbackURL,
      startMode,
    });
    if (isOauth2ErrorResult(result)) {
      console.warn("[SignInButton] signIn.oauth2 failed", result.error);
      window.alert(`Sign in failed: ${oauth2ErrorMessage(result.error)}`);
      return;
    }

    const returnToHostApp =
      effectiveExpoReturn != null &&
      !/^https?:\/\//i.test(effectiveExpoReturn.trim());
    const hasUser = await hasUserAfterRefetch();
    if (!hasUser) {
      logAuthSession("SIGNIN_FLOW:missing_session", {
        at: now(),
        callbackURL,
        oauthCallbackURL: effectiveExpoReturn ?? null,
      });
      console.warn(
        "[SignInButton] OAuth finished but no session was detected after refetch",
      );
      return;
    }

    clearPersistedExpoInappOAuthBridge();
    if (!returnToHostApp) {
      await refetchAndWaitForSessionPropagation();
      router.replace("/page");
    }
  }

  useEffect(() => {
    if (!autoStart) return;
    if (autoStartRanRef.current) return;
    if (busy || oauth2StartInFlight) return;
    autoStartRanRef.current = true;
    oauth2StartInFlight = true;
    setBusy(true);
    void (async () => {
      try {
        await runSignInFlow();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (isAbortError(e)) return;
        console.warn("[SignInButton] signIn.oauth2 failed", e);
        window.alert(`Sign in failed: ${message}`);
      } finally {
        setBusy(false);
        oauth2StartInFlight = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot autoStart; deps mirror Expo
  }, [autoStart, startMode, expoOauthReturnUrl]);

  return (
    <button
      className={`${buttonClassName} min-h-[38px] min-w-[96px]`}
      disabled={busy}
      onClick={async () => {
        if (busy || oauth2StartInFlight) return;
        oauth2StartInFlight = true;
        setBusy(true);
        try {
          await runSignInFlow();
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (isAbortError(e)) {
            return;
          }
          console.warn("[SignInButton] signIn.oauth2 failed", e);
          window.alert(`Sign in failed: ${message}`);
        } finally {
          setBusy(false);
          oauth2StartInFlight = false;
        }
      }}
      type="button"
    >
      {busy ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800"
          aria-hidden
        />
      ) : (
        "Sign in"
      )}
    </button>
  );
}
