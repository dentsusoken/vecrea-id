import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
} from "react-native";
import { router } from "expo-router";

import { authClient, signIn, useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

/** Prevents overlapping `openAuthSession` calls across remounts / double-tap. */
let oauth2StartInFlight = false;

function now() {
  return new Date().toISOString();
}

function describeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
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

/** Session payload from Better Auth's nanostore (not React state — avoids iOS ref lag). */
function sessionUserFromAuthStore(): unknown {
  type SessionAtomSnapshot = { data?: unknown };
  const snap = authClient.$store.atoms.session.get() as SessionAtomSnapshot;
  return snap?.data ?? null;
}

/**
 * Try silent SSO (`prompt=none`); fall back to interactive OAuth when:
 * - the sign-in POST returns an error, or throws (non-abort), or
 * - the POST succeeds but `hasUserAfterRefetch` is false (e.g. OAuth failed in
 *   the in-app browser and only `?error=` was returned).
 */
async function signInCustomWithPromptNoneFallback(options: {
  hasUserAfterRefetch: () => Promise<boolean>;
  callbackURL?: string;
}): Promise<Oauth2SignInResult> {
  const base = {
    providerId: "custom" as const,
    callbackURL: options.callbackURL ?? "/page",
  };

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
   * OAuth post-sign-in URL (e.g. app deep link from `Linking.createURL("/page")`).
   * When set to a non-http(s) URL, this flow returns to the host app; skip local
   * `router.replace` after `signIn.oauth2` (the host handles the deep link).
   */
  oauthCallbackURL?: string;
};

/** Sign-in button entry point (inline implementation). */
export function SignInButton({ oauthCallbackURL }: SignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const { data: session, refetch } = useSession();
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  async function refetchAndWaitForSessionPropagation() {
    await refetch();
    // Wait a few ticks for the session atom/store to propagate to React state.
    // (Better Auth's refetch resolves after updating the atom, but React render can lag.)
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
      if (sessionRef.current !== session) break;
    }
  }

  /**
   * After OAuth returns, confirm whether a session exists (covers callback
   * failures that do not surface as `signIn.oauth2` HTTP errors).
   *
   * Read from `authClient.$store.atoms.session` so we do not depend on React
   * `sessionRef` (on iOS, `useEffect` can lag behind refetch and falsely trigger
   * a second interactive `signIn.oauth2`).
   */
  async function hasUserAfterRefetch(): Promise<boolean> {
    await refetch();
    if (sessionDataHasUser(sessionUserFromAuthStore())) return true;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 48));
      if (sessionDataHasUser(sessionUserFromAuthStore())) return true;
    }
    return sessionDataHasUser(sessionUserFromAuthStore());
  }

  return (
    <Pressable
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        pressed && !busy && styles.buttonPressed,
        busy && styles.buttonDisabled,
      ]}
      onPress={async () => {
        if (busy || oauth2StartInFlight) return;
        oauth2StartInFlight = true;
        setBusy(true);
        try {
          const callbackURL = oauthCallbackURL ?? "/page";
          const result = await signInCustomWithPromptNoneFallback({
            hasUserAfterRefetch,
            callbackURL,
          });
          if (isOauth2ErrorResult(result)) {
            console.warn("[SignInButton] signIn.oauth2 failed", result.error);
            Alert.alert("Sign in failed", oauth2ErrorMessage(result.error));
            return;
          }

          const returnToHostApp =
            oauthCallbackURL != null &&
            !/^https?:\/\//i.test(oauthCallbackURL.trim());
          const hasUser = await hasUserAfterRefetch();
          if (!hasUser) {
            logAuthSession("SIGNIN_FLOW:missing_session", {
              at: now(),
              callbackURL,
              oauthCallbackURL: oauthCallbackURL ?? null,
            });
            Alert.alert(
              "Sign in failed",
              "OAuth finished but no session was created. Please try again.",
            );
            return;
          }

          if (!returnToHostApp) {
            await refetchAndWaitForSessionPropagation();
            router.replace("/page");
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (isAbortError(e)) {
            return;
          }
          console.warn("[SignInButton] signIn.oauth2 failed", e);
          Alert.alert("Sign in failed", message);
        } finally {
          setBusy(false);
          oauth2StartInFlight = false;
        }
      }}
    >
      {busy ? (
        <ActivityIndicator color="#18181b" />
      ) : (
        <Text style={styles.label}>Sign in</Text>
      )}
    </Pressable>
  );
}

const styles = {
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  } as const,
  buttonPressed: {
    transform: [{ translateY: 1 }],
    shadowOpacity: 0.03,
  } as const,
  buttonDisabled: {
    opacity: 0.7,
  } as const,
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18181b",
  } as const,
};
