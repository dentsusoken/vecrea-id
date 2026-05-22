import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthTokens } from "../shared/types.ts";
import { CognitoError, wrapError } from "../shared/errors.ts";

export async function signUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    password?: string;
    attributes?: Record<string, string>;
  },
): Promise<{ userSub: string; userConfirmed: boolean; session?: string }> {
  try {
    const res = await client.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: params.username,
        Password: params.password,
        UserAttributes: params.attributes
          ? Object.entries(params.attributes).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
      }),
    );
    return {
      userSub: res.UserSub ?? "",
      userConfirmed: res.UserConfirmed ?? false,
      session: res.Session,
    };
  } catch (e) {
    wrapError(e);
  }
}

export function confirmSignUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    code: string;
    session?: string;
    forceAliasCreation?: boolean;
    autoSignIn: false;
  },
): Promise<void>;
export function confirmSignUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    code: string;
    session?: string;
    forceAliasCreation?: boolean;
    autoSignIn?: true;
  },
): Promise<AuthTokens>;
export async function confirmSignUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    code: string;
    session?: string;
    forceAliasCreation?: boolean;
    autoSignIn?: boolean;
  },
): Promise<AuthTokens | void> {
  try {
    const res = await client.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: params.username,
        ConfirmationCode: params.code,
        ForceAliasCreation: params.forceAliasCreation,
        Session: params.session,
      }),
    );

    if (params.autoSignIn === false) return;

    if (!res.Session) {
      throw new CognitoError(
        "AutoSignInFailed",
        "ConfirmSignUp did not return a session. Pass the session from signUp() and ensure USER_AUTH flow is enabled on the App Client.",
      );
    }

    const initRes = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_AUTH",
        ClientId: clientId,
        AuthParameters: { USERNAME: params.username },
        Session: res.Session,
      }),
    );

    const r = initRes.AuthenticationResult;
    if (!r?.AccessToken || !r.IdToken || !r.RefreshToken) {
      throw new CognitoError(
        "AutoSignInFailed",
        "Auto sign-in did not return authentication tokens.",
      );
    }
    return {
      accessToken: r.AccessToken,
      idToken: r.IdToken,
      refreshToken: r.RefreshToken,
      expiresIn: r.ExpiresIn ?? 3600,
      tokenType: "Bearer",
    };
  } catch (e) {
    if (e instanceof CognitoError) throw e;
    wrapError(e);
  }
}

export async function resendConfirmationCode(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(
      new ResendConfirmationCodeCommand({
        ClientId: clientId,
        Username: params.username,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
