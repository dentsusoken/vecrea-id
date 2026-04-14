import { Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInButton } from "@/components/auth/SignInButton";
import { useSession } from "@/lib/auth-client";

/**
 * Dedicated sign-in screen (card layout) so it is visually distinct from the demo home.
 */
export default function SignInPage() {
  const { data: session, isPending } = useSession();

  if (!isPending && session?.user) {
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
          <SignInButton />
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
