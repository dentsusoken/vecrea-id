import type { ResourcesConfig } from 'aws-amplify';

function required(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing or empty environment variable: ${name}`);
  }
  return v.trim();
}

/**
 * Cognito USER_AUTH + メール OTP（Hosted UI / OAuth なし）。
 * ユーザープールで Email OTP を有効化し、アプリクライアントに ALLOW_USER_AUTH を付与すること。
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html
 */
export function getAmplifyResourcesConfig(): ResourcesConfig {
  return {
    Auth: {
      Cognito: {
        userPoolId: required('NEXT_PUBLIC_COGNITO_USER_POOL_ID'),
        userPoolClientId: required('NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID'),
        loginWith: {
          email: true,
        },
        passwordless: {
          emailOtpEnabled: true,
          preferredChallenge: 'EMAIL_OTP',
        },
      },
    },
  };
}
