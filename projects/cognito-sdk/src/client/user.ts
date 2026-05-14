import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  UpdateUserAttributesCommand,
  DeleteUserAttributesCommand,
  GetUserAttributeVerificationCodeCommand,
  VerifyUserAttributeCommand,
  DeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export interface UserInfo {
  username: string;
  attributes: Record<string, string>;
}

export async function getUser(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string },
): Promise<UserInfo> {
  try {
    const res = await client.send(new GetUserCommand({ AccessToken: params.accessToken }));
    const attributes: Record<string, string> = {};
    for (const attr of res.UserAttributes ?? []) {
      if (attr.Name && attr.Value !== undefined) {
        attributes[attr.Name] = attr.Value;
      }
    }
    return { username: res.Username ?? "", attributes };
  } catch (e) {
    wrapError(e);
  }
}

export async function updateUserAttributes(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; attributes: Record<string, string> },
): Promise<void> {
  try {
    await client.send(
      new UpdateUserAttributesCommand({
        AccessToken: params.accessToken,
        UserAttributes: Object.entries(params.attributes).map(([Name, Value]) => ({
          Name,
          Value,
        })),
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function deleteUserAttributes(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; attributeNames: string[] },
): Promise<void> {
  try {
    await client.send(
      new DeleteUserAttributesCommand({
        AccessToken: params.accessToken,
        UserAttributeNames: params.attributeNames,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function getAttributeVerificationCode(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; attributeName: string },
): Promise<void> {
  try {
    await client.send(
      new GetUserAttributeVerificationCodeCommand({
        AccessToken: params.accessToken,
        AttributeName: params.attributeName,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function verifyAttribute(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; attributeName: string; code: string },
): Promise<void> {
  try {
    await client.send(
      new VerifyUserAttributeCommand({
        AccessToken: params.accessToken,
        AttributeName: params.attributeName,
        Code: params.code,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function deleteUser(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string },
): Promise<void> {
  try {
    await client.send(new DeleteUserCommand({ AccessToken: params.accessToken }));
  } catch (e) {
    wrapError(e);
  }
}
