import { betterAuth } from "better-auth";
import { customProvider } from "./providers/custom-provider";

/**
 * Server-side Better Auth instance. Authentication is Generic OAuth only
 * (`custom` provider via {@link customProvider}).
 */
export const auth = betterAuth({
  advanced: {
    useSecureCookies: true,
  },
  plugins: [customProvider],
});
