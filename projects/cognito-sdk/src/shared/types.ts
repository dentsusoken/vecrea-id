export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface ChallengeHandlers {
  mfaCode?: (type: "SMS" | "TOTP") => Promise<string>;
  newPassword?: () => Promise<string>;
  customChallenge?: (parameters: Record<string, string>) => Promise<string>;
  /** USER_AUTH flow: called when server returns a PASSWORD challenge */
  password?: () => Promise<string>;
  /** USER_AUTH flow: called when server returns an EMAIL_OTP challenge */
  emailOtp?: () => Promise<string>;
  /** USER_AUTH flow: called when server returns an SMS_OTP challenge */
  smsOtp?: () => Promise<string>;
  /**
   * USER_AUTH flow: called when server returns a WEB_AUTHN challenge.
   * Receives the parsed PublicKeyCredentialRequestOptions JSON.
   * Must return the AuthenticationResponseJSON from navigator.credentials.get().
   */
  webAuthn?: (
    credentialRequestOptions: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  /**
   * USER_AUTH flow: called when server returns a SELECT_CHALLENGE challenge.
   * Must return one of the available challenge names (e.g. "WEB_AUTHN", "EMAIL_OTP").
   */
  selectChallenge?: (availableChallenges: string[]) => Promise<string>;
}
