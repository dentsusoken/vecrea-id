import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { requireUserPoolId } from './env';
import type { User } from '../schemas';
import {
  cognitoBooleanStringToBoolean,
  userAttributesToRecord,
} from './cognitoUserAttributes';

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

  const attributes = userAttributesToRecord(UserAttributes);
  const userId = attributes.sub;
  if (!userId) {
    throw new Error('Cognito user is missing the sub attribute');
  }

  const emailRaw = attributes.email;
  const email =
    emailRaw !== undefined && emailRaw !== '' ? emailRaw : null;

  return {
    userId,
    username: Username,
    attributes,
    email,
    emailVerified: cognitoBooleanStringToBoolean(attributes.email_verified),
    phoneNumber:
      attributes.phone_number !== undefined && attributes.phone_number !== ''
        ? attributes.phone_number
        : null,
    phoneNumberVerified: cognitoBooleanStringToBoolean(
      attributes.phone_number_verified
    ),
    enabled: Enabled,
    status: UserStatus,
    mfaOptions: MFAOptions?.map((o) => ({
      deliveryMedium: o.DeliveryMedium,
      attributeName: o.AttributeName,
    })),
    preferredMfaSetting: PreferredMfaSetting,
    userMfaSettingList: UserMFASettingList,
    createdAt: UserCreateDate?.toISOString(),
    updatedAt: UserLastModifiedDate?.toISOString(),
  };
};
