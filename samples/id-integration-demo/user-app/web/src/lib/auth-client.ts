import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  // Enable Generic OAuth client methods like `signIn.oauth2(...)`.
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
