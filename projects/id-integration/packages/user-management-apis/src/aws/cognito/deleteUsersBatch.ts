/**
 * Batch user deletion: multiple Cognito `AdminDeleteUser` calls (partial success allowed).
 */

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { deleteUser } from './deleteUser';

export type DeleteUsersBatchError = {
  username: string;
  message: string;
  code?: string;
};

/**
 * Attempts to delete every username in `usernames` (in parallel), collecting per-item failures
 * in `errors` when present (HTTP layer typically returns 200 with partial failures, like {@link importUsersCsvToStaging}).
 */
export async function deleteUsersBatch(
  client: CognitoIdentityProviderClient,
  usernames: string[]
): Promise<{
  requestedCount: number;
  successCount: number;
  failureCount: number;
  errors?: DeleteUsersBatchError[];
}> {
  const outcomes = await Promise.allSettled(
    usernames.map((username) => deleteUser(client, username))
  );

  const errors: DeleteUsersBatchError[] = [];
  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i]!;
    if (outcome.status === 'rejected') {
      const username = usernames[i]!;
      const reason = outcome.reason;
      if (reason instanceof Error) {
        errors.push({
          username,
          message: reason.message,
          ...(reason.name ? { code: reason.name } : {}),
        });
      } else {
        errors.push({ username, message: String(reason) });
      }
    }
  }

  const failureCount = errors.length;
  const successCount = usernames.length - failureCount;
  return {
    requestedCount: usernames.length,
    successCount,
    failureCount,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
