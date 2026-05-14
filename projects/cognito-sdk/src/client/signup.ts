import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export async function signUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    password: string;
    attributes?: Record<string, string>;
  },
): Promise<{ userSub: string; userConfirmed: boolean }> {
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
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function confirmSignUp(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { username: string; code: string; forceAliasCreation?: boolean },
): Promise<void> {
  try {
    await client.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: params.username,
        ConfirmationCode: params.code,
        ForceAliasCreation: params.forceAliasCreation,
      }),
    );
  } catch (e) {
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
