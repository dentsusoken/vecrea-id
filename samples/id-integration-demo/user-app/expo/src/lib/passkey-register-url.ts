import * as Linking from "expo-linking";
import { logAuthSession } from "@/lib/session-debug";

function truthyEnv(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function shouldShowPasskeyRegisterLink(): boolean {
  return truthyEnv(process.env.EXPO_PUBLIC_SHOW_PASSKEY_REGISTER_LINK);
}

function cognitoBaseUrlFromEnv(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_PASSKEY_REGISTER_LINK?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

function defaultRedirectUri(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_PASSKEY_REGISTER_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return Linking.createURL("/page");
}

export function buildPasskeyRegisterUrl(): string | null {
  if (!shouldShowPasskeyRegisterLink()) return null;

  const clientId = process.env.EXPO_PUBLIC_PASSKEY_REGISTER_CLIENT_ID?.trim();
  const base = cognitoBaseUrlFromEnv();
  const redirectUri = defaultRedirectUri();
  if (!clientId || !base || !redirectUri) return null;

  try {
    const url = new URL(`${base}/passkeys/add`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    const passkeyRegisterUrl = url.toString();
    logAuthSession("passkey-register-url:built", {
      redirectUri,
      passkeyRegisterUrl,
    });
    return passkeyRegisterUrl;
  } catch {
    return null;
  }
}

