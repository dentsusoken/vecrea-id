import {
  CognitoIdentityProviderClient,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  SetUserMFAPreferenceCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export async function associateTotpToken(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string },
): Promise<{ secretCode: string; session?: string }> {
  try {
    const res = await client.send(
      new AssociateSoftwareTokenCommand({ AccessToken: params.accessToken }),
    );
    return { secretCode: res.SecretCode ?? "", session: res.Session };
  } catch (e) {
    wrapError(e);
  }
}

export async function verifyTotpToken(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; code: string; friendlyDeviceName?: string },
): Promise<void> {
  try {
    await client.send(
      new VerifySoftwareTokenCommand({
        AccessToken: params.accessToken,
        UserCode: params.code,
        FriendlyDeviceName: params.friendlyDeviceName,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export type MfaSetting = "ENABLED" | "PREFERRED" | "DISABLED";

export async function setMfaPreference(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; totp?: MfaSetting; sms?: MfaSetting },
): Promise<void> {
  const toMfaSettings = (s?: MfaSetting) =>
    s ? { Enabled: s !== "DISABLED", PreferredMfa: s === "PREFERRED" } : undefined;
  try {
    await client.send(
      new SetUserMFAPreferenceCommand({
        AccessToken: params.accessToken,
        SoftwareTokenMfaSettings: toMfaSettings(params.totp),
        SMSMfaSettings: toMfaSettings(params.sms),
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
