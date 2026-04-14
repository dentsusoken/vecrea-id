import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/**
 * Public demo home. Includes a link to `/page`, which is session-gated.
 */
export default function DemoHomePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Home</Text>
      <Text style={styles.body}>
        This is the demo app’s root page. You can view it before or after signing
        in, and the header actions update based on your session.
      </Text>
      <Link href="/page" style={styles.primaryLink}>
        <Text style={styles.primaryLinkText}>Go to Page</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
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
