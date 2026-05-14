export enum CognitoErrorCode {
  UserNotFound = "UserNotFoundException",
  NotAuthorized = "NotAuthorizedException",
  UserNotConfirmed = "UserNotConfirmedException",
  CodeMismatch = "CodeMismatchException",
  CodeExpired = "ExpiredCodeException",
  UsernameExists = "UsernameExistsException",
  TooManyRequests = "TooManyRequestsException",
  PasswordResetRequired = "PasswordResetRequiredException",
  InvalidPassword = "InvalidPasswordException",
  InvalidParameter = "InvalidParameterException",
  LimitExceeded = "LimitExceededException",
  MFAMethodNotFound = "MFAMethodNotFoundException",
  SoftwareTokenMFANotFound = "SoftwareTokenMFANotFoundException",
  AliasExists = "AliasExistsException",
  UserLambdaValidation = "UserLambdaValidationException",
  UnexpectedLambda = "UnexpectedLambdaException",
  ResourceNotFound = "ResourceNotFoundException",
}

export class CognitoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

export function wrapError(error: unknown): never {
  if (error != null && typeof error === "object" && "name" in error) {
    const e = error as { name: string; message: string };
    throw new CognitoError(e.name, e.message, error);
  }
  throw new CognitoError("UnknownError", String(error), error);
}
