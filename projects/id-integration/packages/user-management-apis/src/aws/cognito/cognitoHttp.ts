/**
 * Maps Cognito service exceptions to JSON error bodies and HTTP status codes for Hono.
 */

import type { Context } from 'hono';
import {
  AliasExistsException,
  InvalidParameterException,
  InvalidPasswordException,
  NotAuthorizedException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UserNotFoundException,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Converts thrown SDK errors into `{ message, code? }` responses aligned with the OpenAPI `ErrorBody` schema.
 */
export function cognitoErrorResponse(c: Context, err: unknown) {
  if (err instanceof UserNotFoundException) {
    return c.json({ message: err.message, code: err.name }, 404);
  }
  if (err instanceof ResourceNotFoundException) {
    return c.json({ message: err.message, code: err.name }, 404);
  }
  if (
    err instanceof UsernameExistsException ||
    err instanceof AliasExistsException
  ) {
    return c.json({ message: err.message, code: err.name }, 409);
  }
  if (
    err instanceof InvalidParameterException ||
    err instanceof InvalidPasswordException
  ) {
    return c.json({ message: err.message, code: err.name }, 422);
  }
  if (err instanceof NotAuthorizedException) {
    return c.json({ message: err.message, code: err.name }, 403);
  }
  if (err instanceof TooManyRequestsException) {
    return c.json({ message: err.message, code: err.name }, 429);
  }
  if (err instanceof Error) {
    console.error(err);
    return c.json({ message: err.message, code: err.name }, 500);
  }
  return c.json({ message: 'Internal error', code: 'InternalError' }, 500);
}
