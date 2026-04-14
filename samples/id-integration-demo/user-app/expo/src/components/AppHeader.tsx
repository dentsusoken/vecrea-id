import { Link } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { useSession } from "@/lib/auth-client";
import { logAuthSession } from "@/lib/session-debug";

export function AppHeader() {
  const { data: session, isPending, isRefetching, error } = useSession();

  useEffect(() => {
    const snap = session as { user?: { id?: string }; session?: { id?: string } } | null;
    logAuthSession("AppHeader:useSession", {
      isPending,
      isRefetching,
      hasData: Boolean(session),
      hasUser: Boolean(snap?.user),
      userId: snap?.user?.id ?? null,
      sessionId: snap?.session?.id ?? null,
      error: error ? (error as Error).message ?? String(error) : null,
    });
  }, [session, isPending, isRefetching, error]);
  const insets = useSafeAreaInsets();
  const barStyle = [styles.bar, { paddingTop: insets.top + 10 }];

  // Better Auth may leave `data` as a truthy object with no `user` after sign-out;
  // gate on `user`, not on `data` alone.
  if (!session?.user) {
    return (
      <View style={barStyle}>
        <View style={{ flex: 1 }} />
        <Link href="/sign-in" style={styles.primaryLink}>
          <Text style={styles.primaryLinkText}>Sign in</Text>
        </Link>
      </View>
    );
  }

  return (
    <View style={barStyle}>
      <View style={{ flex: 1 }} />
      <SignOutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryLink: {
    borderRadius: 8,
    backgroundColor: "#18181b",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryLinkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
