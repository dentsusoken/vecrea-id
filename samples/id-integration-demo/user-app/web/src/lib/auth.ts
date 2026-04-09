import { betterAuth } from "better-auth";
import { cognito } from "./providers/cognito";

export const auth = betterAuth({
  advanced: {
    useSecureCookies: true,
  },
  socialProviders: {
    cognito,
  },
});
