import type { ResourcesConfig } from "aws-amplify";

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.AMPLIFY_APP_ORIGIN ?? "";
  return raw.replace(/\/$/, "");
}

/**
 * Cognito マネージドログイン（Hosted UI / OAuth）向けの Amplify 設定。
 *
 * コンソール側ではアプリクライアントに次を登録してください（origin は環境と一致させる）:
 * - コールバック URL: {origin}/api/auth/sign-in-callback
 * - サインアウト URL: {origin}/api/auth/sign-out-callback
 * - 許可された OAuth フロー: Authorization code grant
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-integrate-apps.html
 */
export function getAmplifyAuthConfig(): ResourcesConfig {
  const origin = appOrigin();
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";

  return {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID ?? "",
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? "",
        loginWith: {
          oauth: {
            domain,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [`${origin}/api/auth/sign-in-callback`],
            redirectSignOut: [`${origin}/api/auth/sign-out-callback`],
            responseType: "code",
          },
        },
      },
    },
  };
}