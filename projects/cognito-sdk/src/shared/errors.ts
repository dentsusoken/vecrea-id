/**
 * Well-known Cognito error codes surfaced as a typed enum.
 * Check `error.code` against these values to handle specific failure scenarios.
 *
 * @example
 * ```typescript
 * try {
 *   await client.signIn({ username, password });
 * } catch (e) {
 *   if (e instanceof CognitoError) {
 *     if (e.code === CognitoErrorCode.NotAuthorized) {
 *       console.error("Invalid username or password");
 *     } else if (e.code === CognitoErrorCode.UserNotConfirmed) {
 *       console.error("Please verify your email first");
 *     }
 *   }
 * }
 * ```
 */
export enum CognitoErrorCode {
  /** The user does not exist in the user pool. */
  UserNotFound = "UserNotFoundException",
  /** Incorrect username or password, or the user is not authorized. */
  NotAuthorized = "NotAuthorizedException",
  /** The user has not confirmed their account (e.g. email verification pending). */
  UserNotConfirmed = "UserNotConfirmedException",
  /** The confirmation or verification code does not match. */
  CodeMismatch = "CodeMismatchException",
  /** The confirmation or verification code has expired. */
  CodeExpired = "ExpiredCodeException",
  /** An account with the given username or alias already exists. */
  UsernameExists = "UsernameExistsException",
  /** The request was throttled. Retry with exponential back-off. */
  TooManyRequests = "TooManyRequestsException",
  /** The user must reset their password before signing in. */
  PasswordResetRequired = "PasswordResetRequiredException",
  /** The proposed password does not meet the user pool's password policy. */
  InvalidPassword = "InvalidPasswordException",
  /** A required parameter is missing or malformed. */
  InvalidParameter = "InvalidParameterException",
  /** A quota has been exceeded (e.g. too many MFA methods). */
  LimitExceeded = "LimitExceededException",
  /** The specified MFA method was not found for the user. */
  MFAMethodNotFound = "MFAMethodNotFoundException",
  /** No TOTP device is associated with the user. */
  SoftwareTokenMFANotFound = "SoftwareTokenMFANotFoundException",
  /** The requested alias (email/phone) is already in use by another account. */
  AliasExists = "AliasExistsException",
  /** A pre-sign-up or other Lambda trigger rejected the request. */
  UserLambdaValidation = "UserLambdaValidationException",
  /** An unexpected error occurred in a Lambda trigger. */
  UnexpectedLambda = "UnexpectedLambdaException",
  /** The referenced user pool, client, or resource does not exist. */
  ResourceNotFound = "ResourceNotFoundException",
}

/**
 * Wraps every error thrown by Cognito into a typed, catchable object.
 * All SDK methods throw `CognitoError` on failure — the raw AWS SDK error
 * is preserved as `originalError` for debugging.
 */
export class CognitoError extends Error {
  /**
   * @param code - The Cognito exception name (e.g. `"UserNotFoundException"`).
   *   Compare with {@link CognitoErrorCode} for well-known values.
   * @param message - Human-readable error description.
   * @param originalError - The underlying AWS SDK error, if available.
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

/**
 * Converts any AWS SDK error into a {@link CognitoError} and re-throws it.
 * Used internally by all SDK methods — not intended for direct use.
 *
 * @throws {CognitoError} Always.
 */
export function wrapError(error: unknown): never {
  if (error != null && typeof error === "object" && "name" in error) {
    const e = error as { name: string; message: string };
    throw new CognitoError(e.name, e.message, error);
  }
  throw new CognitoError("UnknownError", String(error), error);
}
