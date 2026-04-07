import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { CreateUserRequest, User } from '../schemas';
import { requireUserPoolId } from './env';
import { getUser } from './getUser';
import { mapUserTypeToUser } from './mapToUser';

export async function createUser(
  client: CognitoIdentityProviderClient,
  body: CreateUserRequest
): Promise<User> {
  const attrMap = new Map<string, string>();
  if (body.attributes) {
    for (const [k, v] of Object.entries(body.attributes)) {
      attrMap.set(k, v);
    }
  }
  if (body.email !== undefined) {
    attrMap.set('email', body.email);
  }
  const UserAttributes = [...attrMap.entries()].map(([Name, Value]) => ({
    Name,
    Value,
  }));

  const out = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: requireUserPoolId(),
      Username: body.username,
      UserAttributes: UserAttributes.length ? UserAttributes : undefined,
      TemporaryPassword: body.temporaryPassword,
      MessageAction: body.suppressInvitation ? 'SUPPRESS' : undefined,
    })
  );

  if (out.User) {
    return mapUserTypeToUser(out.User);
  }
  return getUser(client, body.username);
}
