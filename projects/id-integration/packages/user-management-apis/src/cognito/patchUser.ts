import {
  AdminDeleteUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { UpdateUserRequest } from '../schemas';
import { requireUserPoolId } from './env';
import { getUser } from './getUser';

export async function patchUser(
  client: CognitoIdentityProviderClient,
  username: string,
  body: UpdateUserRequest
) {
  const poolId = requireUserPoolId();
  const toSet: { Name: string; Value: string }[] = [];
  const toRemove: string[] = [];

  if (body.email !== undefined) {
    if (body.email === null) toRemove.push('email');
    else toSet.push({ Name: 'email', Value: body.email });
  }
  if (body.emailVerified !== undefined) {
    toSet.push({
      Name: 'email_verified',
      Value: body.emailVerified ? 'true' : 'false',
    });
  }
  if (body.phoneNumber !== undefined) {
    if (body.phoneNumber === null) toRemove.push('phone_number');
    else toSet.push({ Name: 'phone_number', Value: body.phoneNumber });
  }
  if (body.phoneNumberVerified !== undefined) {
    toSet.push({
      Name: 'phone_number_verified',
      Value: body.phoneNumberVerified ? 'true' : 'false',
    });
  }
  if (body.attributes) {
    for (const [Name, Value] of Object.entries(body.attributes)) {
      toSet.push({ Name, Value });
    }
  }

  if (toRemove.length > 0) {
    await client.send(
      new AdminDeleteUserAttributesCommand({
        UserPoolId: poolId,
        Username: username,
        UserAttributeNames: toRemove,
      })
    );
  }
  if (toSet.length > 0) {
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: poolId,
        Username: username,
        UserAttributes: toSet,
      })
    );
  }
  if (body.enabled !== undefined) {
    if (body.enabled) {
      await client.send(
        new AdminEnableUserCommand({ UserPoolId: poolId, Username: username })
      );
    } else {
      await client.send(
        new AdminDisableUserCommand({ UserPoolId: poolId, Username: username })
      );
    }
  }

  return getUser(client, username);
}
