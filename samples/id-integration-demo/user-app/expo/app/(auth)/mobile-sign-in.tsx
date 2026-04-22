import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getSetCookie, normalizeCookieName } from "@better-auth/expo/client";

import { authClient } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

const STORAGE_PREFIX = "id-integration-demo-expo";
const COOKIE_KEY = normalizeCookieName(`${STORAGE_PREFIX}_cookie`);

function resolveAppOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BETTER_AUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:8081";
}

function truncateUrl(u: string, max = 200): string {
  if (u.length <= max) return u;
  return `${u.slice(0, max)}…`;
}

async function saveCookieFromDeepLink(cookieHeaderValue: string): Promise<void> {
  const prevCookie = (await SecureStore.getItemAsync(COOKIE_KEY)) ?? undefined;
  const nextCookie = getSetCookie(cookieHeaderValue, prevCookie);
  await SecureStore.setItemAsync(COOKIE_KEY, nextCookie);
  authClient.$store.notify("$sessionSignal");
}

function parseResultUrl(url: string): { cookie: string | null } {
  try {
    const u = new URL(url);
    return { cookie: u.searchParams.get("cookie") };
  } catch {
    return { cookie: null };
  }
}

/**
 * Native: open the same `/sign-in` UI as web inside an in-app browser session.
 * `oauthCallback` is set so OAuth returns to the app (`Linking.createURL("/page")`).
 */
export default function MobileSignInPage() {
  const [error, setError] = useState<string | null>(null);
  const returnUrl = useMemo(() => Linking.createURL("/page"), []);
  const signInBrowserUrl = useMemo(() => {
    const origin = resolveAppOrigin();
    const q = new URLSearchParams({
      oauthCallback: returnUrl,
    }).toString();
    return `${origin}/sign-in?${q}`;
  }, [returnUrl]);

  useEffect(() => {
    if (Platform.OS === "web") {
      router.replace("/sign-in");
      return;
    }

    void (async () => {
      try {
        const result = await WebBrowser.openAuthSessionAsync(signInBrowserUrl, returnUrl);
        if (result.type !== "success") {
          logAuthSession("SIGNIN_FLOW:authSession:done", {
            at: new Date().toISOString(),
            ok: false,
            resultType: result.type,
          });
          setError(result.type);
          return;
        }
        const { cookie } = parseResultUrl(result.url);
        if (cookie) await saveCookieFromDeepLink(cookie);
        logAuthSession("SIGNIN_FLOW:authSession:done", {
          at: new Date().toISOString(),
          ok: true,
          hasCookie: Boolean(cookie),
        });
        router.replace("/page");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [returnUrl, signInBrowserUrl]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.hint}>Opening sign in…</Text>
        <Text style={styles.subhint}>Continue in the in-app browser.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  hint: {
    fontSize: 14,
    color: "#18181b",
    fontWeight: "600",
  },
  subhint: {
    fontSize: 12,
    color: "#52525b",
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
  },
});
