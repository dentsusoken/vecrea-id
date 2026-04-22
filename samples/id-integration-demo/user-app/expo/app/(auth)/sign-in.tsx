import { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInButton } from "@/components/auth/SignInButton";
import { useSession } from "@/lib/auth-client";

const APP_SCHEME = "id-integration-demo-expo:";
const OIDC_PROMPT_NONE_ERRORS = new Set([
  "login_required",
  "interaction_required",
  "consent_required",
  "account_selection_required",
]);

function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function isExpoGoCallbackUrl(url: string): boolean {
  // Expo Go often uses `exp://.../--/...` or `exp+<slug>://.../--/...`
  if (url.startsWith("exp://")) return true;
  return /^exp\+[^:]+:\/\//.test(url);
}

function parseTrustedOauthCallback(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  if (!decoded.startsWith(APP_SCHEME) && !isExpoGoCallbackUrl(decoded)) return undefined;
  return decoded;
}

/**
 * Dedicated sign-in screen (card layout) so it is visually distinct from the demo home.
 */
export default function SignInPage() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{
    oauthCallback?: string | string[];
    error?: string | string[];
  }>();
  const oauthCallbackURL = useMemo(
    () => parseTrustedOauthCallback(firstSearchParam(params.oauthCallback)),
    [params.oauthCallback],
  );
  const error = useMemo(() => firstSearchParam(params.error), [params.error]);
  const shouldAutoInteractive = useMemo(
    () => (error ? OIDC_PROMPT_NONE_ERRORS.has(error) : false),
    [error],
  );

  // Web UX: if already signed in, skip the sign-in screen and go straight to /page.
  //
  // Native in-app-browser UX: when `oauthCallback` is present we intentionally
  // keep showing the sign-in page (even if the browser has cookies) so the user
  // doesn't land on the app's authenticated /page inside the browser.
  if (!isPending && session?.user && !oauthCallbackURL) {
    return <Redirect href="/page" />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Continue with your identity provider to access protected pages in this
            demo.
          </Text>
        </View>
        <View style={styles.actions}>
          <SignInButton
            oauthCallbackURL={oauthCallbackURL}
            startMode={shouldAutoInteractive ? "interactive" : "silent"}
            autoStart={shouldAutoInteractive}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#fff",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    marginBottom: 22,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#18181b",
  },
  subtitle: {
    fontSize: 14,
    color: "#52525b",
    lineHeight: 20,
  },
  actions: {
    alignItems: "center",
  },
});
