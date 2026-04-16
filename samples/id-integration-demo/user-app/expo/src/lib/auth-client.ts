import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function resolveBaseURL(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:8081";
}

const resolvedBaseURL = resolveBaseURL();

/**
 * Better Auth client with Expo storage + Generic OAuth (`signIn.oauth2`).
 */
const authClient = createAuthClient({
  baseURL: resolvedBaseURL,
  plugins: [
    expoClient({
      scheme: "id-integration-demo-expo",
      storagePrefix: "id-integration-demo-expo",
      storage: SecureStore,
      disableCache: Platform.OS === "android",
    }),
    genericOAuthClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
