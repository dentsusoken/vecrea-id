import {
  CognitoIdentityProviderClient,
  StartWebAuthnRegistrationCommand,
  CompleteWebAuthnRegistrationCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CompleteWebAuthnRegistrationRequest } from "@aws-sdk/client-cognito-identity-provider";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { wrapError } from "../shared/errors.ts";

export async function registerPasskey(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string },
): Promise<void> {
  try {
    const startRes = await client.send(
      new StartWebAuthnRegistrationCommand({
        AccessToken: params.accessToken,
      }),
    );

    const credential = await startRegistration({
      // CredentialCreationOptions is __DocumentType (generic AWS JSON); cast through unknown
      optionsJSON:
        startRes.CredentialCreationOptions as unknown as PublicKeyCredentialCreationOptionsJSON,
    });

    await client.send(
      new CompleteWebAuthnRegistrationCommand({
        AccessToken: params.accessToken,
        // RegistrationResponseJSON is JSON-compatible; cast through unknown to satisfy __DocumentType
        Credential: credential as unknown as CompleteWebAuthnRegistrationRequest["Credential"],
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
