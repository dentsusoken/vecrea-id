import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { User } from '../schemas';
import { requireUserPoolId } from './env';
import { mapCognitoAttributeUserToUser } from './mapToUser';

export const getUser = async (
  cognitoClient: CognitoIdentityProviderClient,
  username: string
): Promise<User> => {
  const command = new AdminGetUserCommand({
    UserPoolId: requireUserPoolId(),
    Username: username,
  });

  const output = await cognitoClient.send(command);
  const {
    Username,
    UserAttributes,
    UserCreateDate,
    UserLastModifiedDate,
    Enabled,
    MFAOptions,
    PreferredMfaSetting,
    UserMFASettingList,
    UserStatus,
  } = output;

  if (!Username || !UserAttributes || UserStatus === undefined) {
    throw new Error(
      'Cognito AdminGetUser response is missing username, attributes, or status'
    );
  }

  return mapCognitoAttributeUserToUser({
    username: Username,
    attributeList: UserAttributes,
    userCreateDate: UserCreateDate,
    userLastModifiedDate: UserLastModifiedDate,
    enabled: Enabled,
    userStatus: UserStatus,
    mfaOptions: MFAOptions,
    preferredMfaSetting: PreferredMfaSetting,
    userMfaSettingList: UserMFASettingList,
  });
};
