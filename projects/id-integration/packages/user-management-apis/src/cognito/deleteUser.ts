import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { requireUserPoolId } from './env';

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
