import { Redirect, Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";
import { buildPasskeyRegisterUrl } from "@/lib/passkey-register-url";

function formatMaybeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Post–sign-in landing page for the demo. Unauthenticated users are sent to
 * `/sign-in` (same idea as the Next.js middleware gate on `/page`).
 */
export default function AfterSignInPage() {
  const { data: session, isPending, isRefetching, error, refetch } = useSession();
  const [nativeVerified, setNativeVerified] = useState(false);
  const pendingSinceRef = useRef<number | null>(null);
  const instanceId = useMemo(() => Math.random().toString(16).slice(2, 8), []);
  const nativeVerifyInFlightRef = useRef(false);
  const passkeyReturnUrl = useMemo(() => Linking.createURL("/page"), []);
  const passkeyRegisterHref = useMemo(() => buildPasskeyRegisterUrl(), []);

  useEffect(() => {
    logAuthSession("page/(main)/page:gate", {
      instanceId,
      isPending,
      isRefetching,
      hasUser: Boolean(session?.user),
      error: error ? (error as Error).message ?? String(error) : null,
    });
  }, [session, isPending, isRefetching, error]);

  useEffect(() => {
    if (!isPending) {
      pendingSinceRef.current = null;
      return;
    }
    if (pendingSinceRef.current == null) pendingSinceRef.current = Date.now();
    const id = setTimeout(() => {
      const ms = pendingSinceRef.current ? Date.now() - pendingSinceRef.current : null;
      logAuthSession("page/(main)/page:pending_too_long", { ms });
    }, 4000);
    return () => clearTimeout(id);
  }, [isPending]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (nativeVerified) return;
    if (nativeVerifyInFlightRef.current) return;
    if (isPending) return;
    if (session?.user) return;
    nativeVerifyInFlightRef.current = true;
    logAuthSession("page/(main)/page:native_verify:effect_start", {
      instanceId,
      nativeVerified,
    });
    void (async () => {
      try {
        await refetch();
      } finally {
        nativeVerifyInFlightRef.current = false;
        logAuthSession("page/(main)/page:native_verify:set_true", { instanceId });
        setNativeVerified(true);
      }
    })();
  }, [isPending, nativeVerified, refetch, session?.user]);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) {
    if (Platform.OS !== "web" && !nativeVerified) {
      logAuthSession("page/(main)/page:native_verify", {
        instanceId,
        isPending,
        nativeVerified,
      });
      return (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      );
    }
    logAuthSession("page/(main)/page:redirect", {
      to: "/sign-in",
    });
    return <Redirect href="/sign-in" />;
  }

  const user = session.user as Record<string, unknown>;
  const email =
    formatMaybeString(user.email) ||
    formatMaybeString(user.emailAddress) ||
    formatMaybeString(user.mail);
  const name =
    formatMaybeString(user.name) ||
    formatMaybeString(user.displayName) ||
    formatMaybeString(user.preferred_username) ||
    formatMaybeString(user.preferredUsername);
  const picture =
    formatMaybeString(user.image) ||
    formatMaybeString(user.picture) ||
    formatMaybeString(user.avatar_url) ||
    formatMaybeString(user.avatarUrl);

  async function handleAddPasskey() {
    if (!passkeyRegisterHref) return;
    logAuthSession("page/(main)/page:passkey:add:open", {
      instanceId,
      platform: Platform.OS,
    });

    const returnUrl =
      process.env.EXPO_PUBLIC_PASSKEY_REGISTER_REDIRECT_URI?.trim() ||
      passkeyReturnUrl;
    const result = await WebBrowser.openAuthSessionAsync(passkeyRegisterHref, returnUrl);
    logAuthSession("page/(main)/page:passkey:add:result", {
      instanceId,
      resultType: result.type,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>After sign-in</Text>
      <Text style={styles.body}>
        Authenticated area — showing user data returned by the IdP (via session).
      </Text>

      <View style={styles.card}>
        <View style={styles.profileRow}>
          {picture ? (
            <Image
              source={{ uri: picture }}
              style={styles.avatar}
              accessibilityLabel="Profile picture"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.profileName}>{name ?? "Unknown user"}</Text>
            <Text style={styles.profileEmail}>{email ?? "(no email)"}</Text>
          </View>
        </View>

        <View style={styles.kv}>
          <Text style={styles.kvLabel}>Raw profile</Text>
          <Text style={styles.kvValue}>{toPrettyJson(user)}</Text>
        </View>
      </View>

      {passkeyRegisterHref ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => {
            void handleAddPasskey();
          }}
        >
          <Text style={styles.secondaryButtonText}>Add a passkey (Cognito)</Text>
        </Pressable>
      ) : null}

      <Link href="/" style={styles.primaryLink}>
        <Text style={styles.primaryLinkText}>Back to Home</Text>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#18181b",
    textAlign: "center",
  },
  body: {
    maxWidth: 360,
    textAlign: "center",
    color: "#52525b",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#fff",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f4f4f5",
  },
  avatarPlaceholder: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#18181b",
  },
  profileEmail: {
    fontSize: 13,
    color: "#52525b",
  },
  kv: {
    gap: 8,
  },
  kvLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18181b",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  kvValue: {
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 16,
    color: "#3f3f46",
  },
  primaryLink: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: "#18181b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryLinkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonPressed: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3f3f46",
    textDecorationLine: "underline",
  },
});
