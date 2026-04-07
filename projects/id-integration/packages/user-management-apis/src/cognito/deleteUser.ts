/**
 * User deletion via Cognito `AdminDeleteUser`.
 */

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { requireUserPoolId } from './env';

/**
 * @param username - Value passed to Cognito `Username` for the user to remove.
 */
export async function deleteUser(
  client: CognitoIdentityProviderClient,
  username: string
): Promise<void> {
  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: requireUserPoolId(),
      Username: username,
    })
  );
}
