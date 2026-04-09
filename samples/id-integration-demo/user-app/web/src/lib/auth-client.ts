import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Shared Better Auth client for React. Loads {@link genericOAuthClient} so
 * `signIn.oauth2` (Generic OAuth) is available on the client.
 */
const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
