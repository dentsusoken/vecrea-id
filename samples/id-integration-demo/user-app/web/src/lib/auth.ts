import { betterAuth } from "better-auth";
import { customProvider } from "./providers/custom-provider";

export const auth = betterAuth({
  advanced: {
    useSecureCookies: true,
  },
  plugins: [customProvider],
});
