import type { ResourcesConfig } from 'aws-amplify';

/**
 * Cognito ユーザープール（メール OTP / USER_AUTH）。
 * choice-based sign-in の EMAIL_OTP とアプリクライアントの ALLOW_USER_AUTH を有効にしてください。
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-selection-sdk.html
 */
export function getAmplifyAuthConfig(): ResourcesConfig {
  return {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID ?? '',
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? '',
      },
    },
  };
}
