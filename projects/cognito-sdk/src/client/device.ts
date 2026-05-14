import {
  CognitoIdentityProviderClient,
  ConfirmDeviceCommand,
  GetDeviceCommand,
  ForgetDeviceCommand,
  ListDevicesCommand,
  UpdateDeviceStatusCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { wrapError } from "../shared/errors.ts";

export interface DeviceInfo {
  deviceKey: string;
  deviceAttributes: Record<string, string>;
  deviceCreateDate?: Date;
  deviceLastModifiedDate?: Date;
  deviceLastAuthenticatedDate?: Date;
}

export async function confirmDevice(
  client: CognitoIdentityProviderClient,
  params: {
    accessToken: string;
    deviceKey: string;
    deviceSecretVerifier?: { passwordVerifier: string; salt: string };
    friendlyDeviceName?: string;
  },
): Promise<void> {
  try {
    await client.send(
      new ConfirmDeviceCommand({
        AccessToken: params.accessToken,
        DeviceKey: params.deviceKey,
        DeviceSecretVerifierConfig: params.deviceSecretVerifier
          ? {
              PasswordVerifier: params.deviceSecretVerifier.passwordVerifier,
              Salt: params.deviceSecretVerifier.salt,
            }
          : undefined,
        DeviceName: params.friendlyDeviceName,
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function getDevice(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; deviceKey: string },
): Promise<DeviceInfo> {
  try {
    const res = await client.send(
      new GetDeviceCommand({ AccessToken: params.accessToken, DeviceKey: params.deviceKey }),
    );
    const d = res.Device!;
    const attrs: Record<string, string> = {};
    for (const a of d.DeviceAttributes ?? []) {
      if (a.Name && a.Value !== undefined) attrs[a.Name] = a.Value;
    }
    return {
      deviceKey: d.DeviceKey ?? "",
      deviceAttributes: attrs,
      deviceCreateDate: d.DeviceCreateDate,
      deviceLastModifiedDate: d.DeviceLastModifiedDate,
      deviceLastAuthenticatedDate: d.DeviceLastAuthenticatedDate,
    };
  } catch (e) {
    wrapError(e);
  }
}

export async function forgetDevice(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; deviceKey: string },
): Promise<void> {
  try {
    await client.send(
      new ForgetDeviceCommand({ AccessToken: params.accessToken, DeviceKey: params.deviceKey }),
    );
  } catch (e) {
    wrapError(e);
  }
}

export async function listDevices(
  client: CognitoIdentityProviderClient,
  params: { accessToken: string; limit?: number; paginationToken?: string },
): Promise<{ devices: DeviceInfo[]; paginationToken?: string }> {
  try {
    const res = await client.send(
      new ListDevicesCommand({
        AccessToken: params.accessToken,
        Limit: params.limit,
        PaginationToken: params.paginationToken,
      }),
    );
    const devices = (res.Devices ?? []).map((d) => {
      const attrs: Record<string, string> = {};
      for (const a of d.DeviceAttributes ?? []) {
        if (a.Name && a.Value !== undefined) attrs[a.Name] = a.Value;
      }
      return {
        deviceKey: d.DeviceKey ?? "",
        deviceAttributes: attrs,
        deviceCreateDate: d.DeviceCreateDate,
        deviceLastModifiedDate: d.DeviceLastModifiedDate,
        deviceLastAuthenticatedDate: d.DeviceLastAuthenticatedDate,
      };
    });
    return { devices, paginationToken: res.PaginationToken };
  } catch (e) {
    wrapError(e);
  }
}

export async function updateDeviceStatus(
  client: CognitoIdentityProviderClient,
  params: {
    accessToken: string;
    deviceKey: string;
    status: "remembered" | "not_remembered";
  },
): Promise<void> {
  try {
    await client.send(
      new UpdateDeviceStatusCommand({
        AccessToken: params.accessToken,
        DeviceKey: params.deviceKey,
        DeviceRememberedStatus: params.status === "remembered" ? "remembered" : "not_remembered",
      }),
    );
  } catch (e) {
    wrapError(e);
  }
}
