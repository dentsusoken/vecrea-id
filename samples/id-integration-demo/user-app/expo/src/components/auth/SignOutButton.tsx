import { router } from "expo-router";
import { Pressable, Text } from "react-native";

import { signOut, useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

/**
 * Signs the user out via Better Auth, then refetches session so the header
 * updates (Expo SecureStore + session atom can get out of sync otherwise).
 */
export function SignOutButton() {
  const { refetch } = useSession();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={async () => {
        logAuthSession("SignOutButton:press", {});
        // Avoid a brief `/page` -> `/sign-in` flicker by leaving gated routes first.
        router.replace("/");
        try {
          await signOut({});
          logAuthSession("SignOutButton:signOut-settled", { ok: true });
        } catch (e) {
          logAuthSession("SignOutButton:signOut-settled", {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
          console.warn("[SignOutButton] signOut request failed", e);
        }
        await refetch();
        logAuthSession("SignOutButton:after-refetch", {});
      }}
    >
      <Text style={styles.label}>Sign out</Text>
    </Pressable>
  );
}

const styles = {
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18181b",
  } as const,
};
