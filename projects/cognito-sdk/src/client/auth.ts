import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  GlobalSignOutCommand,
  RevokeTokenCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import type { AuthTokens, ChallengeHandlers } from "../shared/types.ts";
import { wrapError } from "../shared/errors.ts";
import { createSrpSession, srpAHex, computeSrpVerification } from "../shared/srp.ts";

function tokensFromResult(result: {
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
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

export async function signIn(
  client: CognitoIdentityProviderClient,
  clientId: string,
  userPoolId: string,
  params: {
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  },
): Promise<AuthTokens> {
  const { username, password, onChallenge } = params;
  const poolName = userPoolId.split("_")[1]!;
  const session = createSrpSession();

  try {
    const initRes = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_SRP_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          SRP_A: srpAHex(session),
        },
      }),
    );

    if (initRes.AuthenticationResult) return tokensFromResult(initRes);

    let challengeName = initRes.ChallengeName;
    let challengeParams = initRes.ChallengeParameters ?? {};
    let challengeSession = initRes.Session;

    // Handle PASSWORD_VERIFIER challenge (SRP proof)
    if (challengeName === "PASSWORD_VERIFIER") {
      const srpUsername = (challengeParams["USER_ID_FOR_SRP"] ?? challengeParams["USERNAME"])!;
      const verifier = await computeSrpVerification({
        session,
        poolName,
        username: srpUsername,
        password,
        srpB: challengeParams["SRP_B"]!,
        salt: challengeParams["SALT"]!,
        secretBlock: challengeParams["SECRET_BLOCK"]!,
      });

      const verifyRes = await client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: "PASSWORD_VERIFIER",
          ClientId: clientId,
          Session: challengeSession,
          ChallengeResponses: verifier as unknown as Record<string, string>,
        }),
      );

      if (verifyRes.AuthenticationResult) return tokensFromResult(verifyRes);
      challengeName = verifyRes.ChallengeName;
      challengeParams = verifyRes.ChallengeParameters ?? {};
      challengeSession = verifyRes.Session;
    }

    // Handle post-SRP challenges
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
      } else if (challengeName === "CUSTOM_CHALLENGE") {
        const answer = await onChallenge?.customChallenge?.(challengeParams);
        if (!answer) throw new Error("Custom challenge answer required");
        responses = {
          USERNAME: (challengeParams["USERNAME"] ?? username)!,
          ANSWER: answer,
        };
      } else {
        throw new Error(`Unsupported challenge: ${challengeName}`);
      }

      const res = await client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: challengeName,
          ClientId: clientId,
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

export async function refreshTokens(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { refreshToken: string },
): Promise<AuthTokens> {
  try {
    const res = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: clientId,
        AuthParameters: { REFRESH_TOKEN: params.refreshToken },
      }),
    );
    return tokensFromResult(res);
  } catch (e) {
    wrapError(e);
  }
}

export async function signInWithPassword(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: {
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  },
): Promise<AuthTokens> {
  const { username, password, onChallenge } = params;

  try {
    const initRes = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
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
        responses = { USERNAME: (challengeParams["USERNAME"] ?? username)!, [key]: code };
      } else if (challengeName === "NEW_PASSWORD_REQUIRED") {
        const newPwd = await onChallenge?.newPassword?.();
        if (!newPwd) throw new Error("New password required");
        responses = { USERNAME: (challengeParams["USERNAME"] ?? username)!, NEW_PASSWORD: newPwd };
      } else if (challengeName === "CUSTOM_CHALLENGE") {
        const answer = await onChallenge?.customChallenge?.(challengeParams);
        if (!answer) throw new Error("Custom challenge answer required");
        responses = { USERNAME: (challengeParams["USERNAME"] ?? username)!, ANSWER: answer };
      } else {
        throw new Error(`Unsupported challenge: ${challengeName}`);
      }

      const res = await client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: challengeName as ChallengeNameType,
          ClientId: clientId,
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

export async function signInWithUserAuth(
  client: CognitoIdentityProviderClient,
  clientId: string,
  userPoolId: string,
  params: {
    username: string;
    preferredChallenge?: "WEB_AUTHN" | "EMAIL_OTP" | "SMS_OTP" | "PASSWORD" | "PASSWORD_SRP";
    password?: string;
    onChallenge?: ChallengeHandlers;
  },
): Promise<AuthTokens> {
  const { username, preferredChallenge, password, onChallenge } = params;
  const poolName = userPoolId.split("_")[1]!;

  const authParameters: Record<string, string> = { USERNAME: username };
  if (preferredChallenge) authParameters["PREFERRED_CHALLENGE"] = preferredChallenge;

  let srpSession = preferredChallenge === "PASSWORD_SRP" ? createSrpSession() : undefined;
  if (srpSession) authParameters["SRP_A"] = srpAHex(srpSession);

  try {
    const initRes = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_AUTH",
        ClientId: clientId,
        AuthParameters: authParameters,
      }),
    );

    if (initRes.AuthenticationResult) return tokensFromResult(initRes);

    let challengeName = initRes.ChallengeName;
    let challengeParams = initRes.ChallengeParameters ?? {};
    let challengeSession = initRes.Session;

    while (challengeName) {
      let responses: Record<string, string> = {};

      if (challengeName === "SELECT_CHALLENGE") {
        const available = (challengeParams["AVAILABLE_CHALLENGES"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const selected = await onChallenge?.selectChallenge?.(available);
        if (!selected) throw new Error("Challenge selection required");
        responses = { USERNAME: username, ANSWER: selected };
        if (selected === "PASSWORD_SRP") {
          srpSession = createSrpSession();
          responses["SRP_A"] = srpAHex(srpSession);
        }
      } else if (challengeName === "WEB_AUTHN") {
        const optionsJSON = JSON.parse(
          challengeParams["CREDENTIAL_REQUEST_OPTIONS_JSON"] ?? "{}",
        ) as PublicKeyCredentialRequestOptionsJSON;
        const credential = await startAuthentication({ optionsJSON });
        responses = { USERNAME: username, CREDENTIAL: JSON.stringify(credential) };
      } else if (challengeName === "EMAIL_OTP") {
        const code = await onChallenge?.emailOtp?.();
        if (!code) throw new Error("Email OTP code required");
        responses = { USERNAME: username, EMAIL_OTP_CODE: code };
      } else if (challengeName === "SMS_OTP") {
        const code = await onChallenge?.smsOtp?.();
        if (!code) throw new Error("SMS OTP code required");
        responses = { USERNAME: username, SMS_OTP_CODE: code };
      } else if (challengeName === "PASSWORD") {
        const pwd = password ?? (await onChallenge?.password?.());
        if (!pwd) throw new Error("Password required");
        responses = { USERNAME: username, PASSWORD: pwd };
      } else if (challengeName === "PASSWORD_VERIFIER") {
        if (!srpSession) srpSession = createSrpSession();
        const srpUsername = (challengeParams["USER_ID_FOR_SRP"] ?? challengeParams["USERNAME"])!;
        const pwd = password ?? (await onChallenge?.password?.());
        if (!pwd) throw new Error("Password required for SRP");
        const verifier = await computeSrpVerification({
          session: srpSession,
          poolName,
          username: srpUsername,
          password: pwd,
          srpB: challengeParams["SRP_B"]!,
          salt: challengeParams["SALT"]!,
          secretBlock: challengeParams["SECRET_BLOCK"]!,
        });
        responses = verifier as unknown as Record<string, string>;
      } else if (challengeName === "SOFTWARE_TOKEN_MFA" || challengeName === "SMS_MFA") {
        const type = challengeName === "SOFTWARE_TOKEN_MFA" ? "TOTP" : "SMS";
        const code = await onChallenge?.mfaCode?.(type);
        if (!code) throw new Error(`MFA code required for ${type}`);
        const key =
          challengeName === "SOFTWARE_TOKEN_MFA" ? "SOFTWARE_TOKEN_MFA_CODE" : "SMS_MFA_CODE";
        responses = { USERNAME: (challengeParams["USERNAME"] ?? username)!, [key]: code };
      } else if (challengeName === "NEW_PASSWORD_REQUIRED") {
        const newPwd = await onChallenge?.newPassword?.();
        if (!newPwd) throw new Error("New password required");
        responses = {
          USERNAME: (challengeParams["USERNAME"] ?? username)!,
          NEW_PASSWORD: newPwd,
        };
      } else if (challengeName === "CUSTOM_CHALLENGE") {
        const answer = await onChallenge?.customChallenge?.(challengeParams);
        if (!answer) throw new Error("Custom challenge answer required");
        responses = { USERNAME: (challengeParams["USERNAME"] ?? username)!, ANSWER: answer };
      } else {
        throw new Error(`Unsupported challenge: ${challengeName}`);
      }

      const res = await client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: challengeName as ChallengeNameType,
          ClientId: clientId,
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

export async function signOut(
  client: CognitoIdentityProviderClient,
  clientId: string,
  params: { accessToken: string; global?: boolean; refreshToken?: string },
): Promise<void> {
  try {
    if (params.global) {
      await client.send(new GlobalSignOutCommand({ AccessToken: params.accessToken }));
    } else if (params.refreshToken) {
      await client.send(new RevokeTokenCommand({ Token: params.refreshToken, ClientId: clientId }));
    }
  } catch (e) {
    wrapError(e);
  }
}
