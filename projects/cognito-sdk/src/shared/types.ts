/**
 * Tokens returned by a successful authentication.
 * The SDK is stateless — store these in your application and pass them to
 * methods that require an `accessToken` or `refreshToken`.
 */
export interface AuthTokens {
  /** JWT used to call AWS services and the SDK's user/device/MFA methods. */
  accessToken: string;
  /** JWT containing identity claims (email, sub, etc.). */
  idToken: string;
  /** Opaque token used to obtain a new `accessToken` without re-authenticating. */
  refreshToken: string;
  /** Lifetime of `accessToken` and `idToken` in seconds (typically 3600). */
  expiresIn: number;
  /** Always `"Bearer"`. */
  tokenType: "Bearer";
}

/**
 * Callbacks invoked during an interactive authentication challenge.
 * All handlers are optional — an error is thrown if a required handler is absent
 * when the corresponding challenge is returned by Cognito.
 *
 * @example
 * ```typescript
 * const handlers: ChallengeHandlers = {
 *   mfaCode: async (type) => {
 *     return prompt(`Enter ${type} code`) ?? "";
 *   },
 *   newPassword: async () => {
 *     return prompt("Choose a new password") ?? "";
 *   },
 * };
 * ```
 */
export interface ChallengeHandlers {
  /**
   * Called when a `SOFTWARE_TOKEN_MFA` (TOTP) or `SMS_MFA` challenge is returned.
   *
   * @param type - `"TOTP"` for authenticator-app codes, `"SMS"` for SMS codes.
   * @returns The one-time code entered by the user.
   */
  mfaCode?: (type: "SMS" | "TOTP") => Promise<string>;

  /**
   * Called when a `NEW_PASSWORD_REQUIRED` challenge is returned (e.g. after
   * admin-created accounts with a temporary password).
   *
   * @returns The new password chosen by the user.
   */
  newPassword?: () => Promise<string>;

  /**
   * Called when a `CUSTOM_CHALLENGE` is returned by a Lambda trigger.
   *
   * @param parameters - Challenge parameters provided by the Lambda trigger.
   * @returns The answer to the custom challenge.
   */
  customChallenge?: (parameters: Record<string, string>) => Promise<string>;

  /**
   * `USER_AUTH` flow only — called when a `PASSWORD` challenge is returned.
   * Use this when you want to supply the password lazily (e.g. after the server
   * has already confirmed which challenge type it will use).
   *
   * @returns The user's password.
   */
  password?: () => Promise<string>;

  /**
   * `USER_AUTH` flow only — called when an `EMAIL_OTP` challenge is returned.
   * Cognito sends a one-time code to the user's verified email address.
   *
   * @returns The OTP entered by the user.
   */
  emailOtp?: () => Promise<string>;

  /**
   * `USER_AUTH` flow only — called when an `SMS_OTP` challenge is returned.
   * Cognito sends a one-time code to the user's registered phone number.
   * Requires SMS configuration on the User Pool.
   *
   * @returns The OTP entered by the user.
   */
  smsOtp?: () => Promise<string>;

  /**
   * `USER_AUTH` flow only — called when a `WEB_AUTHN` challenge is returned.
   *
   * The callback receives the `PublicKeyCredentialRequestOptions` parsed from
   * Cognito's `CREDENTIAL_REQUEST_OPTIONS_JSON` challenge parameter.
   * Your implementation should call `navigator.credentials.get({ publicKey: options })`
   * and return the resulting `AuthenticationResponseJSON`.
   *
   * @remarks Requires a browser environment with WebAuthn support (`window.PublicKeyCredential`).
   * The origin must match the Relying Party ID configured on the User Pool.
   *
   * @param credentialRequestOptions - Parsed `PublicKeyCredentialRequestOptions`.
   * @returns The `AuthenticationResponseJSON` to send back to Cognito as `CREDENTIAL`.
   *
   * @example
   * ```typescript
   * webAuthn: async (options) => {
   *   const credential = await navigator.credentials.get({
   *     publicKey: options as PublicKeyCredentialRequestOptions,
   *   }) as PublicKeyCredential;
   *   const resp = credential.response as AuthenticatorAssertionResponse;
   *   return {
   *     id: credential.id,
   *     rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
   *     type: credential.type,
   *     response: {
   *       clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(resp.clientDataJSON))),
   *       authenticatorData: btoa(String.fromCharCode(...new Uint8Array(resp.authenticatorData))),
   *       signature:         btoa(String.fromCharCode(...new Uint8Array(resp.signature))),
   *     },
   *   };
   * },
   * ```
   */
  webAuthn?: (
    credentialRequestOptions: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;

  /**
   * `USER_AUTH` flow only — called when a `SELECT_CHALLENGE` challenge is returned.
   * This happens when no `preferredChallenge` was specified, or when the preferred
   * method is unavailable for the user.
   *
   * @param availableChallenges - List of challenge names the server accepts
   *   (e.g. `["WEB_AUTHN", "EMAIL_OTP", "PASSWORD"]`).
   * @returns The name of the challenge the user wants to use.
   */
  selectChallenge?: (availableChallenges: string[]) => Promise<string>;
}
