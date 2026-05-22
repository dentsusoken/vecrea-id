import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import type { AuthTokens, ChallengeHandlers } from "../shared/types.ts";
import { signIn, signInWithPassword, signInWithUserAuth, refreshTokens, signOut } from "./auth.ts";
import { signUp, confirmSignUp, resendConfirmationCode } from "./signup.ts";
import { changePassword, forgotPassword, confirmForgotPassword } from "./password.ts";
import {
  getUser,
  updateUserAttributes,
  deleteUserAttributes,
  getAttributeVerificationCode,
  verifyAttribute,
  deleteUser,
} from "./user.ts";
import { associateTotpToken, verifyTotpToken, setMfaPreference } from "./mfa.ts";
import {
  confirmDevice,
  getDevice,
  forgetDevice,
  listDevices,
  updateDeviceStatus,
} from "./device.ts";
import { registerPasskey, listPasskeys, deletePasskey } from "./webauthn.ts";
import type { PasskeyInfo } from "./webauthn.ts";
import type { DeviceInfo } from "./device.ts";
import type { UserInfo } from "./user.ts";
import type { MfaSetting } from "./mfa.ts";

export type { AuthTokens, ChallengeHandlers, UserInfo, DeviceInfo, MfaSetting, PasskeyInfo };
export { CognitoError, CognitoErrorCode } from "../shared/errors.ts";

/**
 * Configuration for the client-side Cognito SDK.
 * All values can be found in the AWS Cognito console under your User Pool.
 */
export interface CognitoClientConfig {
  /** AWS region where the User Pool is hosted (e.g. `"us-east-1"`). */
  region: string;
  /**
   * User Pool ID (e.g. `"us-east-1_aBcDeFgHi"`).
   * Used internally for SRP and `USER_AUTH` flows.
   */
  userPoolId: string;
  /**
   * App Client ID (no secret) associated with the User Pool.
   * The client must have the appropriate auth flows enabled.
   */
  clientId: string;
}

/**
 * Client-side Cognito operations.
 * Obtain an instance via {@link createCognitoClient}.
 *
 * All methods throw {@link CognitoError} on failure.
 * The SDK is stateless — tokens are returned to the caller and never stored internally.
 *
 * @example
 * ```typescript
 * import { createCognitoClient, CognitoError, CognitoErrorCode } from "@vecrea/cognito-sdk/client";
 *
 * const client = createCognitoClient({
 *   region: "us-east-1",
 *   userPoolId: "us-east-1_aBcDeFgHi",
 *   clientId: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
 * });
 *
 * try {
 *   const tokens = await client.signIn({ username: "user@example.com", password: "secret" });
 *   console.log(tokens.accessToken);
 * } catch (e) {
 *   if (e instanceof CognitoError && e.code === CognitoErrorCode.NotAuthorized) {
 *     console.error("Wrong credentials");
 *   }
 * }
 * ```
 */
export interface CognitoClient {
  // ---- Authentication ----

  /**
   * Authenticates a user via SRP (Secure Remote Password) — `USER_SRP_AUTH` flow.
   *
   * The password is never sent to the server in plain text; instead a
   * cryptographic proof is constructed client-side using RFC 3526 Group 15.
   * This is the recommended flow for browser clients.
   *
   * After a successful SRP verification, Cognito may issue further challenges
   * (MFA, new-password-required, custom) before returning tokens.
   *
   * @param params.username - The user's username, email, or phone alias.
   * @param params.password - The user's password (used locally for SRP computation).
   * @param params.onChallenge - Handlers for MFA / new-password / custom challenges.
   * @returns Authentication tokens.
   * @throws {CognitoError} `NotAuthorized` — wrong credentials.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   * @throws {CognitoError} `UserNotConfirmed` — email/phone not yet verified.
   * @throws {CognitoError} `PasswordResetRequired` — admin-initiated reset pending.
   */
  signIn(params: {
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;

  /**
   * Authenticates a user by sending the password in plain text — `USER_PASSWORD_AUTH` flow.
   *
   * Simpler to implement than SRP but exposes the password on the wire.
   * Only use over HTTPS. Suitable for server-side integrations where
   * the security boundary is the server itself.
   *
   * Supports the same post-authentication challenges as {@link signIn}.
   *
   * @param params.username - The user's username, email, or phone alias.
   * @param params.password - The user's password (sent to the server).
   * @param params.onChallenge - Handlers for MFA / new-password / custom challenges.
   * @returns Authentication tokens.
   * @throws {CognitoError} `NotAuthorized` — wrong credentials.
   * @throws {CognitoError} `UserNotConfirmed` — account not verified.
   */
  signInWithPassword(params: {
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;

  /**
   * Authenticates a user using the unified `USER_AUTH` flow, which supports
   * WebAuthn (passkeys), email OTP, SMS OTP, plain-text password, and SRP.
   *
   * The `preferredChallenge` hint tells Cognito which method the user prefers.
   * If omitted (or unavailable), Cognito returns a `SELECT_CHALLENGE` challenge
   * listing the methods registered for that user — handle it via
   * `onChallenge.selectChallenge`.
   *
   * Challenge flow:
   * - `"WEB_AUTHN"` → `onChallenge.webAuthn` is called with `PublicKeyCredentialRequestOptions`
   * - `"EMAIL_OTP"` → Cognito emails a code → `onChallenge.emailOtp`
   * - `"SMS_OTP"`   → Cognito texts a code  → `onChallenge.smsOtp`
   * - `"PASSWORD"`  → `onChallenge.password` (or pass `params.password`)
   * - `"PASSWORD_SRP"` → SRP proof computed automatically; password supplied via
   *   `params.password` or `onChallenge.password`
   *
   * @param params.username - The user's username or email alias.
   * @param params.preferredChallenge - The preferred authentication method.
   * @param params.password - Password, used when `preferredChallenge` is
   *   `"PASSWORD"` or `"PASSWORD_SRP"`. Can alternatively be supplied via
   *   `onChallenge.password`.
   * @param params.onChallenge - Handlers for all possible challenge types.
   * @returns Authentication tokens.
   * @throws {CognitoError} `NotAuthorized` — wrong credentials.
   * @throws {CognitoError} `UserNotConfirmed` — account not verified.
   */
  signInWithUserAuth(params: {
    username: string;
    preferredChallenge?: "WEB_AUTHN" | "EMAIL_OTP" | "SMS_OTP" | "PASSWORD" | "PASSWORD_SRP";
    password?: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;

  /**
   * Obtains a new set of tokens using a refresh token — `REFRESH_TOKEN_AUTH` flow.
   * Call this before the `accessToken` expires to maintain a session without
   * requiring the user to re-authenticate.
   *
   * @param params.refreshToken - The refresh token from a previous authentication.
   * @returns New `accessToken`, `idToken`, and updated expiry. The `refreshToken`
   *   in the result is the same token (Cognito does not rotate it on refresh).
   * @throws {CognitoError} `NotAuthorized` — refresh token is invalid or revoked.
   */
  refreshTokens(params: { refreshToken: string }): Promise<AuthTokens>;

  /**
   * Signs the user out.
   *
   * - `global: true` — calls `GlobalSignOut`, invalidating all tokens across all
   *   devices for this user (requires `accessToken`).
   * - `refreshToken` provided — calls `RevokeToken`, invalidating only that
   *   refresh token and the access tokens it issued.
   * - Neither — no server call is made; discard tokens client-side only.
   *
   * @param params.accessToken - Required when `global` is `true`.
   * @param params.global - If `true`, signs out from all devices.
   * @param params.refreshToken - Revokes this specific refresh token.
   */
  signOut(params: { accessToken: string; global?: boolean; refreshToken?: string }): Promise<void>;

  // ---- Sign-up ----

  /**
   * Registers a new user. After a successful call the user is in `UNCONFIRMED`
   * state; complete sign-up with {@link confirmSignUp}.
   *
   * For **passwordless** user pools (email OTP / SMS OTP), omit `password`.
   * Cognito will send a one-time code to the user's email/phone for confirmation.
   *
   * @param params.username - The desired username (or email if the pool uses email as username).
   * @param params.password - The user's password. Omit for passwordless user pools.
   * @param params.attributes - Standard Cognito attributes, e.g.
   *   `{ email: "user@example.com", given_name: "Alice" }`.
   *   Custom attributes must be prefixed with `custom:`.
   * @returns `userSub` — the immutable UUID for this user; `userConfirmed` — `true`
   *   if the pool is configured for auto-confirmation; `session` — pass to
   *   {@link confirmSignUp} to enable seamless auto sign-in after confirmation
   *   (no second OTP required).
   * @throws {CognitoError} `UsernameExists` — account already exists.
   * @throws {CognitoError} `InvalidPassword` — password policy violation.
   * @throws {CognitoError} `InvalidParameter` — required attribute missing.
   */
  signUp(params: {
    username: string;
    /** Omit for passwordless sign-in (email OTP / SMS OTP user pools). */
    password?: string;
    attributes?: Record<string, string>;
  }): Promise<{ userSub: string; userConfirmed: boolean; session?: string }>;

  /**
   * Confirms a new user account and, by default, immediately signs them in.
   *
   * Pass the `session` from the {@link signUp} response to enable seamless auto sign-in:
   * Cognito treats the OTP already submitted at confirmation as the primary auth factor,
   * so the user is not asked to enter a code a second time.
   *
   * Set `autoSignIn: false` to skip auto sign-in and return `void` instead.
   *
   * @param params.username - The username used during sign-up.
   * @param params.code - The confirmation code from email or SMS.
   * @param params.session - The `session` returned by {@link signUp}. Pass this to
   *   enable seamless auto sign-in (no second OTP entry). Requires `USER_AUTH` flow
   *   to be enabled on the App Client.
   * @param params.autoSignIn - Pass `false` to skip auto sign-in and return `void`.
   *   Defaults to `true`.
   * @param params.forceAliasCreation - If `true`, moves the alias (email/phone) from
   *   an existing unconfirmed account to this one.
   * @throws {CognitoError} `CodeMismatch` — wrong code.
   * @throws {CognitoError} `CodeExpired` — code has expired; call {@link resendConfirmationCode}.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   * @throws {CognitoError} `AutoSignInFailed` — session was not returned by Cognito,
   *   or `USER_AUTH` flow is not enabled on the App Client.
   */
  confirmSignUp(params: {
    username: string;
    code: string;
    session?: string;
    forceAliasCreation?: boolean;
    autoSignIn: false;
  }): Promise<void>;
  confirmSignUp(params: {
    username: string;
    code: string;
    session?: string;
    forceAliasCreation?: boolean;
    autoSignIn?: true;
  }): Promise<AuthTokens>;

  /**
   * Resends the confirmation code for an `UNCONFIRMED` user.
   *
   * @param params.username - The username of the unconfirmed user.
   * @throws {CognitoError} `TooManyRequests` — rate limit hit; wait before retrying.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   */
  resendConfirmationCode(params: { username: string }): Promise<void>;

  // ---- Password management ----

  /**
   * Changes the password for an authenticated user.
   * The user must be signed in (valid `accessToken` required).
   *
   * @param params.accessToken - The user's current access token.
   * @param params.previousPassword - The current password.
   * @param params.proposedPassword - The new password (must meet the pool's password policy).
   * @throws {CognitoError} `NotAuthorized` — wrong previous password.
   * @throws {CognitoError} `InvalidPassword` — new password violates policy.
   */
  changePassword(params: {
    accessToken: string;
    previousPassword: string;
    proposedPassword: string;
  }): Promise<void>;

  /**
   * Initiates the forgot-password flow. Cognito sends a reset code to the
   * user's verified email or phone number.
   *
   * Complete the reset with {@link confirmForgotPassword}.
   *
   * @param params.username - The username or email alias of the account to reset.
   * @throws {CognitoError} `UserNotFound` — user does not exist.
   * @throws {CognitoError} `TooManyRequests` — rate limit hit.
   */
  forgotPassword(params: { username: string }): Promise<void>;

  /**
   * Completes the forgot-password flow by submitting the reset code and
   * the new password.
   *
   * @param params.username - The username used in {@link forgotPassword}.
   * @param params.code - The reset code from email or SMS.
   * @param params.newPassword - The new password.
   * @throws {CognitoError} `CodeMismatch` — wrong reset code.
   * @throws {CognitoError} `CodeExpired` — code has expired; call {@link forgotPassword} again.
   * @throws {CognitoError} `InvalidPassword` — password policy violation.
   */
  confirmForgotPassword(params: {
    username: string;
    code: string;
    newPassword: string;
  }): Promise<void>;

  // ---- User attributes ----

  /**
   * Returns the profile of the currently signed-in user.
   *
   * @param params.accessToken - The user's access token.
   * @returns Username and a map of all Cognito attribute name → value pairs.
   */
  getUser(params: { accessToken: string }): Promise<UserInfo>;

  /**
   * Updates one or more user attributes. If the pool requires verification
   * for the attribute (e.g. email), the user will receive a confirmation code;
   * complete verification with {@link verifyAttribute}.
   *
   * Custom attributes must be prefixed with `custom:`.
   *
   * @param params.accessToken - The user's access token.
   * @param params.attributes - Map of attribute name → value to set.
   * @throws {CognitoError} `InvalidParameter` — attribute name or value is invalid.
   */
  updateUserAttributes(params: {
    accessToken: string;
    attributes: Record<string, string>;
  }): Promise<void>;

  /**
   * Deletes one or more user attributes.
   * Required or immutable attributes (e.g. `sub`) cannot be deleted.
   *
   * @param params.accessToken - The user's access token.
   * @param params.attributeNames - List of attribute names to remove (e.g. `["custom:nickname"]`).
   */
  deleteUserAttributes(params: { accessToken: string; attributeNames: string[] }): Promise<void>;

  /**
   * Sends a verification code to the user so they can verify a mutable attribute
   * (e.g. a newly set email address).
   *
   * @param params.accessToken - The user's access token.
   * @param params.attributeName - The attribute to verify (e.g. `"email"`, `"phone_number"`).
   */
  getAttributeVerificationCode(params: {
    accessToken: string;
    attributeName: string;
  }): Promise<void>;

  /**
   * Verifies a user attribute using the code sent by {@link getAttributeVerificationCode}.
   *
   * @param params.accessToken - The user's access token.
   * @param params.attributeName - The attribute being verified.
   * @param params.code - The verification code.
   * @throws {CognitoError} `CodeMismatch` — wrong code.
   * @throws {CognitoError} `CodeExpired` — code has expired.
   */
  verifyAttribute(params: {
    accessToken: string;
    attributeName: string;
    code: string;
  }): Promise<void>;

  /**
   * Deletes the signed-in user's account permanently. This action is irreversible.
   *
   * @param params.accessToken - The user's access token.
   */
  deleteUser(params: { accessToken: string }): Promise<void>;

  // ---- MFA ----

  /**
   * Begins TOTP (Time-based One-Time Password) setup by generating a secret key.
   *
   * Steps:
   * 1. Call `associateTotpToken` to get `secretCode`.
   * 2. Display `secretCode` (or a `otpauth://` QR code) for the user to scan in
   *    an authenticator app.
   * 3. Call {@link verifyTotpToken} with the first code to confirm setup.
   * 4. Call {@link setMfaPreference} to enable/prefer TOTP.
   *
   * @param params.accessToken - The user's access token.
   * @returns `secretCode` — base32-encoded TOTP secret to add to an authenticator app.
   */
  associateTotpToken(params: {
    accessToken: string;
  }): Promise<{ secretCode: string; session?: string }>;

  /**
   * Verifies and finalises TOTP setup by confirming the first code from the
   * authenticator app. Must be called after {@link associateTotpToken}.
   *
   * @param params.accessToken - The user's access token.
   * @param params.code - A valid 6-digit TOTP code from the authenticator app.
   * @param params.friendlyDeviceName - Optional label for the TOTP device (e.g. `"Authy"`).
   * @throws {CognitoError} `CodeMismatch` — the TOTP code is incorrect.
   */
  verifyTotpToken(params: {
    accessToken: string;
    code: string;
    friendlyDeviceName?: string;
  }): Promise<void>;

  /**
   * Sets the MFA preference for the signed-in user.
   *
   * - `"ENABLED"` — MFA is enabled but not the default.
   * - `"PREFERRED"` — MFA is enabled and used as the primary second factor.
   * - `"DISABLED"` — MFA is turned off for this method.
   *
   * At most one method can be `"PREFERRED"` at a time.
   *
   * @param params.accessToken - The user's access token.
   * @param params.totp - Setting for TOTP (authenticator app).
   * @param params.sms - Setting for SMS MFA.
   *
   * @example
   * ```typescript
   * // Enable TOTP as the preferred MFA method, disable SMS
   * await client.setMfaPreference({
   *   accessToken,
   *   totp: "PREFERRED",
   *   sms: "DISABLED",
   * });
   * ```
   */
  setMfaPreference(params: {
    accessToken: string;
    totp?: MfaSetting;
    sms?: MfaSetting;
  }): Promise<void>;

  // ---- WebAuthn / Passkey ----

  /**
   * Registers a passkey (WebAuthn credential) for the signed-in user.
   *
   * Calls `StartWebAuthnRegistration` to obtain credential creation options,
   * invokes `navigator.credentials.create()` via `@simplewebauthn/browser`,
   * then calls `CompleteWebAuthnRegistration` to finalize registration.
   *
   * Requires `@simplewebauthn/browser` to be installed in your application.
   * Requires a browser environment with WebAuthn support.
   * The origin must match the Relying Party ID configured on the User Pool.
   *
   * @param params.accessToken - The user's access token.
   * @throws {CognitoError} If the User Pool is not configured for WebAuthn,
   *   or the browser/authenticator rejects the credential creation.
   *
   * @example
   * ```typescript
   * await client.registerPasskey({ accessToken });
   * ```
   */
  registerPasskey(params: { accessToken: string }): Promise<void>;

  /**
   * Lists all passkeys (WebAuthn credentials) registered for the signed-in user.
   *
   * @param params.accessToken - The user's access token.
   * @param params.nextToken - Pagination token from a previous response.
   * @returns List of {@link PasskeyInfo} and an optional `nextToken` for the next page.
   */
  listPasskeys(params: {
    accessToken: string;
    nextToken?: string;
  }): Promise<{ credentials: PasskeyInfo[]; nextToken?: string }>;

  /**
   * Deletes a passkey registered for the signed-in user.
   *
   * @param params.accessToken - The user's access token.
   * @param params.credentialId - The credential ID from {@link listPasskeys}.
   */
  deletePasskey(params: { accessToken: string; credentialId: string }): Promise<void>;

  // ---- Device tracking ----

  /**
   * Confirms and optionally remembers a device after sign-in.
   * Remembered devices can skip MFA on subsequent sign-ins (if the pool is configured
   * to allow it). Call this after receiving a `NewDeviceMetadata` in a sign-in response.
   *
   * @param params.accessToken - The user's access token.
   * @param params.deviceKey - The device key from `NewDeviceMetadata`.
   * @param params.deviceSecretVerifier - SRP verifier for the device. Omit to remember
   *   the device without device-level SRP verification.
   * @param params.friendlyDeviceName - Human-readable label (e.g. `"Alice's MacBook"`).
   */
  confirmDevice(params: {
    accessToken: string;
    deviceKey: string;
    deviceSecretVerifier?: { passwordVerifier: string; salt: string };
    friendlyDeviceName?: string;
  }): Promise<void>;

  /**
   * Retrieves details for a specific remembered device.
   *
   * @param params.accessToken - The user's access token.
   * @param params.deviceKey - The device key to look up.
   * @returns Device metadata including attributes and timestamps.
   * @throws {CognitoError} `ResourceNotFound` — device does not exist or is not remembered.
   */
  getDevice(params: { accessToken: string; deviceKey: string }): Promise<DeviceInfo>;

  /**
   * Forgets (unregisters) a device. The user will be prompted to confirm
   * the device again on next sign-in.
   *
   * @param params.accessToken - The user's access token.
   * @param params.deviceKey - The device key to forget.
   */
  forgetDevice(params: { accessToken: string; deviceKey: string }): Promise<void>;

  /**
   * Lists all remembered devices for the signed-in user.
   *
   * @param params.accessToken - The user's access token.
   * @param params.limit - Maximum number of devices to return per page (default: all).
   * @param params.paginationToken - Token from a previous response to fetch the next page.
   * @returns Array of {@link DeviceInfo} and an optional `paginationToken` for the next page.
   */
  listDevices(params: {
    accessToken: string;
    limit?: number;
    paginationToken?: string;
  }): Promise<{ devices: DeviceInfo[]; paginationToken?: string }>;

  /**
   * Updates the remembered status of a device.
   *
   * - `"remembered"` — the device is trusted and may skip MFA.
   * - `"not_remembered"` — the device is tracked but not trusted for MFA bypass.
   *
   * @param params.accessToken - The user's access token.
   * @param params.deviceKey - The device to update.
   * @param params.status - The new remembered status.
   */
  updateDeviceStatus(params: {
    accessToken: string;
    deviceKey: string;
    status: "remembered" | "not_remembered";
  }): Promise<void>;
}

/**
 * Creates a {@link CognitoClient} bound to the given User Pool configuration.
 * The client is stateless and safe to share across requests.
 *
 * @example
 * ```typescript
 * import { createCognitoClient } from "@vecrea/cognito-sdk/client";
 *
 * const client = createCognitoClient({
 *   region: "us-east-1",
 *   userPoolId: "us-east-1_aBcDeFgHi",
 *   clientId: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
 * });
 * ```
 */
export function createCognitoClient(config: CognitoClientConfig): CognitoClient {
  const awsClient = new CognitoIdentityProviderClient({ region: config.region });
  const { userPoolId, clientId } = config;

  return {
    signIn: (p) => signIn(awsClient, clientId, userPoolId, p),
    signInWithPassword: (p) => signInWithPassword(awsClient, clientId, p),
    signInWithUserAuth: (p) => signInWithUserAuth(awsClient, clientId, userPoolId, p),
    refreshTokens: (p) => refreshTokens(awsClient, clientId, p),
    signOut: (p) => signOut(awsClient, clientId, p),

    signUp: (p) => signUp(awsClient, clientId, p),
    // confirmSignUp has overloaded signatures; the cast is necessary because TypeScript
    // cannot propagate overload types through a lambda wrapper in an object literal.
    confirmSignUp: ((p: Parameters<CognitoClient["confirmSignUp"]>[0]) =>
      confirmSignUp(
        awsClient,
        clientId,
        p as Parameters<typeof confirmSignUp>[2],
      )) as unknown as CognitoClient["confirmSignUp"],
    resendConfirmationCode: (p) => resendConfirmationCode(awsClient, clientId, p),

    changePassword: (p) => changePassword(awsClient, p),
    forgotPassword: (p) => forgotPassword(awsClient, clientId, p),
    confirmForgotPassword: (p) => confirmForgotPassword(awsClient, clientId, p),

    getUser: (p) => getUser(awsClient, p),
    updateUserAttributes: (p) => updateUserAttributes(awsClient, p),
    deleteUserAttributes: (p) => deleteUserAttributes(awsClient, p),
    getAttributeVerificationCode: (p) => getAttributeVerificationCode(awsClient, p),
    verifyAttribute: (p) => verifyAttribute(awsClient, p),
    deleteUser: (p) => deleteUser(awsClient, p),

    associateTotpToken: (p) => associateTotpToken(awsClient, p),
    verifyTotpToken: (p) => verifyTotpToken(awsClient, p),
    setMfaPreference: (p) => setMfaPreference(awsClient, p),

    registerPasskey: (p) => registerPasskey(awsClient, p),
    listPasskeys: (p) => listPasskeys(awsClient, p),
    deletePasskey: (p) => deletePasskey(awsClient, p),

    confirmDevice: (p) => confirmDevice(awsClient, p),
    getDevice: (p) => getDevice(awsClient, p),
    forgetDevice: (p) => forgetDevice(awsClient, p),
    listDevices: (p) => listDevices(awsClient, p),
    updateDeviceStatus: (p) => updateDeviceStatus(awsClient, p),
  };
}
