import type { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthTokens, ChallengeHandlers } from "../shared/types.ts";
import { wrapError } from "../shared/errors.ts";

function tokensFromResult(result: {
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
  };
}): AuthTokens {
  const r = result.AuthenticationResult;
  if (!r?.AccessToken || !r.IdToken || !r.RefreshToken) {
    throw new Error("Incomplete authentication result");
  }
  return {
    accessToken: r.AccessToken,
    idToken: r.IdToken,
    refreshToken: r.RefreshToken,
    expiresIn: r.ExpiresIn ?? 3600,
    tokenType: "Bearer",
  };
}

export async function adminSignIn(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  params: {
    clientId: string;
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  },
): Promise<AuthTokens> {
  const { clientId, username, password, onChallenge } = params;

  try {
    const initRes = await client.send(
      new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: username, PASSWORD: password },
      }),
    );

    if (initRes.AuthenticationResult) return tokensFromResult(initRes);

    let challengeName = initRes.ChallengeName;
    let challengeParams = initRes.ChallengeParameters ?? {};
    let challengeSession = initRes.Session;

    while (challengeName) {
      let responses: Record<string, string> = {};

      if (challengeName === "SOFTWARE_TOKEN_MFA" || challengeName === "SMS_MFA") {
        const type = challengeName === "SOFTWARE_TOKEN_MFA" ? "TOTP" : "SMS";
        const code = await onChallenge?.mfaCode?.(type);
        if (!code) throw new Error(`MFA code required for ${type}`);
        const key =
          challengeName === "SOFTWARE_TOKEN_MFA" ? "SOFTWARE_TOKEN_MFA_CODE" : "SMS_MFA_CODE";
        responses = {
          USERNAME: (challengeParams["USERNAME"] ?? username)!,
          [key]: code,
        };
      } else if (challengeName === "NEW_PASSWORD_REQUIRED") {
        const newPwd = await onChallenge?.newPassword?.();
        if (!newPwd) throw new Error("New password required");
        responses = {
          USERNAME: (challengeParams["USERNAME"] ?? username)!,
          NEW_PASSWORD: newPwd,
        };
      } else {
        throw new Error(`Unsupported challenge: ${challengeName}`);
      }

      const res = await client.send(
        new AdminRespondToAuthChallengeCommand({
          UserPoolId: userPoolId,
          ClientId: clientId,
          ChallengeName: challengeName,
          Session: challengeSession,
          ChallengeResponses: responses,
        }),
      );

      if (res.AuthenticationResult) return tokensFromResult(res);
      challengeName = res.ChallengeName;
      challengeParams = res.ChallengeParameters ?? {};
      challengeSession = res.Session;
    }

    throw new Error("Authentication did not complete");
  } catch (e) {
    if (e instanceof Error && e.name === "CognitoError") throw e;
    wrapError(e);
  }
}
