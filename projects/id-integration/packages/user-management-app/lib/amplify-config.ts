import type { ResourcesConfig } from 'aws-amplify';

/**
 * Origin used for OAuth redirect URL resolution (must match AMPLIFY_APP_ORIGIN in hosting).
 * @see https://docs.amplify.aws/javascript/build-a-backend/server-side-rendering/nextjs/
 */
export function getAppOrigin(): string {
  const o =
    process.env.AMPLIFY_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    '';
  if (!o) {
    throw new Error(
      'Set AMPLIFY_APP_ORIGIN or NEXT_PUBLIC_APP_ORIGIN (e.g. https://your-app.amplifyapp.com)',
    );
  }
  return o.replace(/\/$/, '');
}

/**
 * Cognito / Hosted UI OAuth config for @aws-amplify/adapter-nextjs server auth routes.
 * Register the callback URLs on the app client:
 * - `{origin}/api/auth/sign-in-callback`
 * - `{origin}/api/auth/sign-out-callback`
 */
export function getAmplifyResourcesConfig(): ResourcesConfig {
  const origin = getAppOrigin();
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim();
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID?.trim();
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.trim();

  if (!userPoolId || !userPoolClientId || !domain) {
    throw new Error(
      'Missing NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID, or NEXT_PUBLIC_COGNITO_DOMAIN',
    );
  }

  return {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [`${origin}/api/auth/sign-in-callback`],
            redirectSignOut: [`${origin}/api/auth/sign-out-callback`],
            responseType: 'code',
          },
        },
      },
    },
  };
}
