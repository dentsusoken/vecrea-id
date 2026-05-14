import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import type { AuthTokens, ChallengeHandlers } from "../shared/types.ts";
import { signIn, refreshTokens, signOut } from "./auth.ts";
import { signUp, confirmSignUp, resendConfirmationCode } from "./signup.ts";
import { changePassword, forgotPassword, confirmForgotPassword } from "./password.ts";
import {
  getUser,
  updateUserAttributes,
  deleteUserAttributes,
  getAttributeVerificationCode,
  verifyAttribute,
  deleteUser,
} from "./user.ts";
import { associateTotpToken, verifyTotpToken, setMfaPreference } from "./mfa.ts";
import {
  confirmDevice,
  getDevice,
  forgetDevice,
  listDevices,
  updateDeviceStatus,
} from "./device.ts";
import type { DeviceInfo } from "./device.ts";
import type { UserInfo } from "./user.ts";
import type { MfaSetting } from "./mfa.ts";

export type { AuthTokens, ChallengeHandlers, UserInfo, DeviceInfo, MfaSetting };
export { CognitoError, CognitoErrorCode } from "../shared/errors.ts";

export interface CognitoClientConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

export interface CognitoClient {
  // Auth
  signIn(params: {
    username: string;
    password: string;
    onChallenge?: ChallengeHandlers;
  }): Promise<AuthTokens>;
  refreshTokens(params: { refreshToken: string }): Promise<AuthTokens>;
  signOut(params: { accessToken: string; global?: boolean; refreshToken?: string }): Promise<void>;

  // Sign-up
  signUp(params: {
    username: string;
    password: string;
    attributes?: Record<string, string>;
  }): Promise<{ userSub: string; userConfirmed: boolean }>;
  confirmSignUp(params: {
    username: string;
    code: string;
    forceAliasCreation?: boolean;
  }): Promise<void>;
  resendConfirmationCode(params: { username: string }): Promise<void>;

  // Password
  changePassword(params: {
    accessToken: string;
    previousPassword: string;
    proposedPassword: string;
  }): Promise<void>;
  forgotPassword(params: { username: string }): Promise<void>;
  confirmForgotPassword(params: {
    username: string;
    code: string;
    newPassword: string;
  }): Promise<void>;

  // User
  getUser(params: { accessToken: string }): Promise<UserInfo>;
  updateUserAttributes(params: {
    accessToken: string;
    attributes: Record<string, string>;
  }): Promise<void>;
  deleteUserAttributes(params: { accessToken: string; attributeNames: string[] }): Promise<void>;
  getAttributeVerificationCode(params: {
    accessToken: string;
    attributeName: string;
  }): Promise<void>;
  verifyAttribute(params: {
    accessToken: string;
    attributeName: string;
    code: string;
  }): Promise<void>;
  deleteUser(params: { accessToken: string }): Promise<void>;

  // MFA
  associateTotpToken(params: {
    accessToken: string;
  }): Promise<{ secretCode: string; session?: string }>;
  verifyTotpToken(params: {
    accessToken: string;
    code: string;
    friendlyDeviceName?: string;
  }): Promise<void>;
  setMfaPreference(params: {
    accessToken: string;
    totp?: MfaSetting;
    sms?: MfaSetting;
  }): Promise<void>;

  // Device
  confirmDevice(params: {
    accessToken: string;
    deviceKey: string;
    deviceSecretVerifier?: { passwordVerifier: string; salt: string };
    friendlyDeviceName?: string;
  }): Promise<void>;
  getDevice(params: { accessToken: string; deviceKey: string }): Promise<DeviceInfo>;
  forgetDevice(params: { accessToken: string; deviceKey: string }): Promise<void>;
  listDevices(params: {
    accessToken: string;
    limit?: number;
    paginationToken?: string;
  }): Promise<{ devices: DeviceInfo[]; paginationToken?: string }>;
  updateDeviceStatus(params: {
    accessToken: string;
    deviceKey: string;
    status: "remembered" | "not_remembered";
  }): Promise<void>;
}

export function createCognitoClient(config: CognitoClientConfig): CognitoClient {
  const awsClient = new CognitoIdentityProviderClient({ region: config.region });
  const { userPoolId, clientId } = config;

  return {
    signIn: (p) => signIn(awsClient, clientId, userPoolId, p),
    refreshTokens: (p) => refreshTokens(awsClient, clientId, p),
    signOut: (p) => signOut(awsClient, clientId, p),

    signUp: (p) => signUp(awsClient, clientId, p),
    confirmSignUp: (p) => confirmSignUp(awsClient, clientId, p),
    resendConfirmationCode: (p) => resendConfirmationCode(awsClient, clientId, p),

    changePassword: (p) => changePassword(awsClient, p),
    forgotPassword: (p) => forgotPassword(awsClient, clientId, p),
    confirmForgotPassword: (p) => confirmForgotPassword(awsClient, clientId, p),

    getUser: (p) => getUser(awsClient, p),
    updateUserAttributes: (p) => updateUserAttributes(awsClient, p),
    deleteUserAttributes: (p) => deleteUserAttributes(awsClient, p),
    getAttributeVerificationCode: (p) => getAttributeVerificationCode(awsClient, p),
    verifyAttribute: (p) => verifyAttribute(awsClient, p),
    deleteUser: (p) => deleteUser(awsClient, p),

    associateTotpToken: (p) => associateTotpToken(awsClient, p),
    verifyTotpToken: (p) => verifyTotpToken(awsClient, p),
    setMfaPreference: (p) => setMfaPreference(awsClient, p),

    confirmDevice: (p) => confirmDevice(awsClient, p),
    getDevice: (p) => getDevice(awsClient, p),
    forgetDevice: (p) => forgetDevice(awsClient, p),
    listDevices: (p) => listDevices(awsClient, p),
    updateDeviceStatus: (p) => updateDeviceStatus(awsClient, p),
  };
}
