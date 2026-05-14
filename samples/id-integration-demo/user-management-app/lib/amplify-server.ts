import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { getAmplifyAuthConfig } from '@/lib/amplify-config';

/**
 * `createServerRunner` enables **experimental** server-only auth (HttpOnly cookies) when
 * `AMPLIFY_APP_ORIGIN` is a valid URL. That mode is for Cognito Managed Login via
 * `createAuthRouteHandlers` and is **incompatible** with client-side `signIn` / `confirmSignIn`
 * + `getCurrentUser()` (EMAIL_OTP / USER_AUTH).
 *
 * On Amplify Hosting, `AMPLIFY_APP_ORIGIN` is often set → duplicate cookies (Strict+HttpOnly vs
 * Lax), header nav missing (client cannot read session), and middleware still seeing tokens
 * after client `signOut`.
 *
 * Opt in to experimental server auth with `AMPLIFY_EXPERIMENTAL_SERVER_AUTH=true` (and use
 * hosted-UI routes only).
 */
if (process.env.AMPLIFY_EXPERIMENTAL_SERVER_AUTH !== 'true') {
  delete process.env.AMPLIFY_APP_ORIGIN;
}

export const { runWithAmplifyServerContext } = createServerRunner({
  config: getAmplifyAuthConfig(),
  runtimeOptions: {
    cookies: {
      sameSite: 'lax',
    },
  },
});
