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
}
