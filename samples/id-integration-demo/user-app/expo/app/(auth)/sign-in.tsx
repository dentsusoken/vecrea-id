import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
 * Native: open the web sign-in UI inside an in-app browser session and return
 * to the app via deep link.
 */
export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const returnUrl = useMemo(() => Linking.createURL("/page"), []);
  const homeUrl = useMemo(() => Linking.createURL("/"), []);
  const signInBrowserUrl = useMemo(() => {
    const origin = resolveAppOrigin();
    const q = new URLSearchParams({
      oauthCallback: returnUrl,
      appHomeCallback: homeUrl,
    }).toString();
    return `${origin}/sign-in?${q}`;
  }, [returnUrl, homeUrl]);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Web sign-in is hosted elsewhere; go back to the home page.
      router.replace("/");
      return;
    }

    void (async () => {
      try {
        logAuthSession("sign-in:begin", {
          signInBrowserUrl: truncateUrl(signInBrowserUrl),
          returnUrl: truncateUrl(returnUrl),
        });
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
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.homeButton,
                pressed && styles.homeButtonPressed,
              ]}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        ) : null}
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
  errorBox: {
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
  },
  homeButton: {
    borderRadius: 8,
    backgroundColor: "#18181b",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  homeButtonPressed: {
    opacity: 0.85,
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

