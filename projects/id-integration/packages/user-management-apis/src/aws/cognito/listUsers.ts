/**
 * Paginated user listing via Cognito `ListUsers`.
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { requireUserPoolId } from '../env';
import { mapUserTypeToUser } from './mapToUser';

/**
 * @param query.limit - Max `Limit` (1–60).
 * @param query.paginationToken - Opaque `PaginationToken` from a prior response.
 */
export async function listUsers(
  client: CognitoIdentityProviderClient,
  query: { limit?: number; paginationToken?: string }
) {
  const out = await client.send(
    new ListUsersCommand({
      UserPoolId: requireUserPoolId(),
      Limit: query.limit,
      PaginationToken: query.paginationToken,
    })
  );
  const items = (out.Users ?? []).map((u) => mapUserTypeToUser(u));
  return {
    items,
    paginationToken: out.PaginationToken,
  };
}
