import {
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export async function changePassword(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; previousPassword: string; proposedPassword: string },
): Promise<void> {
  try {
    await client.send(
      new ChangePasswordCommand({
        AccessToken: params.accessToken,
        PreviousPassword: params.previousPassword,
        ProposedPassword: params.proposedPassword,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function forgotPassword(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { username: string },
): Promise<void> {
  try {
    await client.send(new ForgotPasswordCommand({ ClientId: clientId, Username: params.username }));
  } catch (e) {
    wrapError(e);
  }
}

export async function confirmForgotPassword(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { username: string; code: string; newPassword: string },
): Promise<void> {
  try {
    await client.send(
      new ConfirmForgotPasswordCommand({
        ClientId: clientId,
        Username: params.username,
        ConfirmationCode: params.code,
        Password: params.newPassword,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
