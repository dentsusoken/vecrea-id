import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
} from "react-native";
import { router } from "expo-router";

import { signIn, useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

/** Prevents overlapping `openAuthSession` calls across remounts / double-tap. */
let oauth2StartInFlight = false;

/** Sign-in button entry point (inline implementation). */
export function SignInButton() {
  const [busy, setBusy] = useState(false);
  const { refetch } = useSession();

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
        logAuthSession("SignInButton:press", {});
        try {
          await signIn.oauth2({
            providerId: "custom",
            // Use a relative path so the Expo plugin can generate the correct deep link:
            // - Expo Go dev: exp://...
            // - standalone/dev-client: <scheme>://...
            callbackURL: "/page",
          });
          logAuthSession("SignInButton:oauth2-settled", { ok: true });
          await refetch();
          router.replace("/page");
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logAuthSession("SignInButton:oauth2-settled", {
            ok: false,
            error: message,
          });
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
