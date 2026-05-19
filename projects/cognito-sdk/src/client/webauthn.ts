import {
  CognitoIdentityProviderClient,
  StartWebAuthnRegistrationCommand,
  CompleteWebAuthnRegistrationCommand,
  ListWebAuthnCredentialsCommand,
  DeleteWebAuthnCredentialCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CompleteWebAuthnRegistrationRequest } from "@aws-sdk/client-cognito-identity-provider";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { wrapError, CognitoError } from "../shared/errors.ts";

// Browsers treat localhost as a secure context, so this check naturally bypasses localhost
// while enforcing HTTPS for all other origins.
function assertSecureContext(): void {
  // globalThis.isSecureContext is false only in browsers on non-HTTPS non-localhost origins.
  // Undefined in Node.js — skip the check there.
  if ((globalThis as { isSecureContext?: boolean }).isSecureContext === false) {
    throw new CognitoError(
      "WebAuthnRequiresHTTPS",
      "WebAuthn requires a secure context (HTTPS). Localhost is allowed for development.",
    );
  }
}

/** A passkey (WebAuthn credential) registered for a user. */
export interface PasskeyInfo {
  /** The unique identifier of the passkey credential. */
  credentialId: string;
  /** An automatically-generated friendly name for the passkey. */
  friendlyName: string;
  /** The relying-party ID (domain) the passkey is registered to. */
  relyingPartyId: string;
  /** `"platform"` (built-in biometrics) or `"cross-platform"` (security key). */
  authenticatorAttachment?: string;
  /** When the passkey was registered. */
  createdAt: Date;
}

export async function registerPasskey(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string },
): Promise<void> {
  try {
    assertSecureContext();
    const startRes = await client.send(
      new StartWebAuthnRegistrationCommand({
        AccessToken: params.accessToken,
      }),
    );

    const rawCreation = startRes.CredentialCreationOptions as unknown as {
      publicKey?: PublicKeyCredentialCreationOptionsJSON;
    } & PublicKeyCredentialCreationOptionsJSON;
    // Cognito may wrap options in a `publicKey` envelope matching the browser API shape.
    const creationOptionsJSON: PublicKeyCredentialCreationOptionsJSON =
      rawCreation.publicKey ?? rawCreation;
    const credential = await startRegistration({ optionsJSON: creationOptionsJSON });

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

export async function listPasskeys(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; nextToken?: string },
): Promise<{ credentials: PasskeyInfo[]; nextToken?: string }> {
  try {
    const res = await client.send(
      new ListWebAuthnCredentialsCommand({
        AccessToken: params.accessToken,
        NextToken: params.nextToken,
      }),
    );
    return {
      credentials: (res.Credentials ?? []).map((c) => ({
        credentialId: c.CredentialId ?? "",
        friendlyName: c.FriendlyCredentialName ?? "",
        relyingPartyId: c.RelyingPartyId ?? "",
        authenticatorAttachment: c.AuthenticatorAttachment,
        createdAt: c.CreatedAt ?? new Date(0),
      })),
      nextToken: res.NextToken,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function deletePasskey(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; credentialId: string },
): Promise<void> {
  try {
    await client.send(
      new DeleteWebAuthnCredentialCommand({
        AccessToken: params.accessToken,
        CredentialId: params.credentialId,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
