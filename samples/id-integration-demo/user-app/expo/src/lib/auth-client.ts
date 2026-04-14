import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { logAuthSession } from "@/lib/session-debug";

function resolveBaseURL(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:8081";
}

const resolvedBaseURL = resolveBaseURL();
logAuthSession("client:init", {
  baseURL: resolvedBaseURL,
  EXPO_PUBLIC_BETTER_AUTH_URL:
    process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? "(unset)",
});

/**
 * Better Auth client with Expo storage + Generic OAuth (`signIn.oauth2`).
 */
const authClient = createAuthClient({
  baseURL: resolvedBaseURL,
  fetchOptions: {
    onSuccess(context) {
      const url = String(context.request?.url ?? "");
      if (url.includes("sign-in/oauth2")) {
        const d = context.data as Record<string, unknown> | null | undefined;
        const keys =
          d && typeof d === "object" && !Array.isArray(d)
            ? Object.keys(d)
            : [];
        logAuthSession("fetch:sign-in-oauth2:response", {
          redirect: Boolean(d?.redirect),
          hasAuthUrl: Boolean(d?.url),
          keys,
          message: typeof d?.message === "string" ? d.message : undefined,
          code: typeof d?.code === "string" ? d.code : undefined,
        });
      }
      if (!url.includes("get-session")) return;
      const body = context.data as
        | { user?: { id?: string }; session?: { id?: string } }
        | null
        | undefined;
      logAuthSession("fetch:get-session:ok", {
        url,
        hasUser: Boolean(body?.user),
        userId: body?.user?.id ?? null,
        hasSessionRecord: Boolean(body?.session),
        sessionId: body?.session?.id ?? null,
      });
    },
    onError(context) {
      const url = String(context.request?.url ?? "");
      if (!url.includes("/api/auth") && !url.includes("sign-in/oauth2")) return;
      const err = context.error as
        | { status?: number; message?: string }
        | undefined;
      logAuthSession("fetch:error", {
        url,
        status: err?.status ?? null,
        message: err?.message ?? String(err ?? "unknown"),
      });
    },
  },
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
