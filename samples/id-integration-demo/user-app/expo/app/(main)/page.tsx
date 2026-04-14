import { Redirect, Link } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

/**
 * Post–sign-in landing page for the demo. Unauthenticated users are sent to
 * `/sign-in` (same idea as the Next.js middleware gate on `/page`).
 */
export default function AfterSignInPage() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    logAuthSession("page/(main)/page:gate", {
      isPending,
      hasUser: Boolean(session?.user),
    });
  }, [session, isPending]);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>After sign-in</Text>
      <Text style={styles.body}>
        Authenticated area — placeholder post sign-in view (demo).
      </Text>
      <Link href="/" style={styles.primaryLink}>
        <Text style={styles.primaryLinkText}>Back to Home</Text>
      </Link>
    </View>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
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
});
