import type {
  AttributeType,
  MFAOptionType,
  UserStatusType,
  UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import type { User } from '../schemas';
import {
  cognitoBooleanStringToBoolean,
  userAttributesToRecord,
} from './cognitoUserAttributes';

export function mapCognitoAttributeUserToUser(params: {
  username: string;
  attributeList: AttributeType[] | undefined;
  userCreateDate?: Date;
  userLastModifiedDate?: Date;
  enabled?: boolean;
  userStatus: UserStatusType;
  mfaOptions?: MFAOptionType[];
  preferredMfaSetting?: string;
  userMfaSettingList?: string[] | undefined;
}): User {
  const attributes = userAttributesToRecord(params.attributeList);
  const userId = attributes.sub;
  if (!userId) {
    throw new Error('Cognito user is missing the sub attribute');
  }
  const emailRaw = attributes.email;
  const email =
    emailRaw !== undefined && emailRaw !== '' ? emailRaw : null;

  return {
    userId,
    username: params.username,
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
    enabled: params.enabled,
    status: params.userStatus,
    mfaOptions: params.mfaOptions?.map((o) => ({
      deliveryMedium: o.DeliveryMedium,
      attributeName: o.AttributeName,
    })),
    preferredMfaSetting: params.preferredMfaSetting,
    userMfaSettingList: params.userMfaSettingList,
    createdAt: params.userCreateDate?.toISOString(),
    updatedAt: params.userLastModifiedDate?.toISOString(),
  };
}

export function mapUserTypeToUser(user: UserType): User {
  if (!user.Username || !user.Attributes || user.UserStatus === undefined) {
    throw new Error(
      'Cognito UserType entry is missing username, attributes, or status'
    );
  }
  return mapCognitoAttributeUserToUser({
    username: user.Username,
    attributeList: user.Attributes,
    userCreateDate: user.UserCreateDate,
    userLastModifiedDate: user.UserLastModifiedDate,
    enabled: user.Enabled,
    userStatus: user.UserStatus,
    mfaOptions: user.MFAOptions,
  });
}
