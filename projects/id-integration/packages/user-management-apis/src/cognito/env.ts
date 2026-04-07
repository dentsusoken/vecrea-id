/**
 * Returns the Cognito user pool ID from `USER_POOL_ID`.
 *
 * @throws {Error} When the variable is unset or blank.
 */
export function requireUserPoolId(): string {
  const id = process.env.USER_POOL_ID;
  if (id === undefined || id.trim() === '') {
    throw new Error('USER_POOL_ID environment variable is not set');
  }
  return id;
}
