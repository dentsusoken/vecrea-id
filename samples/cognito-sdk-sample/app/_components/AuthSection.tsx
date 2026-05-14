"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import type { AuthTokens } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
  onTokens: (t: Tokens) => void;
}

// ---- signIn (SRP) ----

function SignInCard({ config, onTokens }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const api = useApiCall<AuthTokens>();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      const result = await client.signIn({
        username,
        password,
        onChallenge: {
          mfaCode: async () => {
            const code = window.prompt("Enter MFA code (TOTP/SMS):");
            return code ?? "";
          },
          newPassword: async () => {
            const pwd = window.prompt("Enter new password:");
            return pwd ?? "";
          },
        },
      });
      onTokens(result);
      return result;
    });
  }

  return (
    <DemoCard title="signIn (SRP)" signature="client.signIn({ username, password, onChallenge? })">
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
        <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run signIn"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- signInWithPassword ----

function SignInWithPasswordCard({ config, onTokens }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const api = useApiCall<AuthTokens>();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      const result = await client.signInWithPassword({
        username,
        password,
        onChallenge: {
          mfaCode: async () => {
            const code = window.prompt("Enter MFA code:");
            return code ?? "";
          },
          newPassword: async () => {
            const pwd = window.prompt("Enter new password:");
            return pwd ?? "";
          },
        },
      });
      onTokens(result);
      return result;
    });
  }

  return (
    <DemoCard
      title="signInWithPassword (plain-text)"
      signature="client.signInWithPassword({ username, password, onChallenge? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
        <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run signInWithPassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- signInWithUserAuth ----

function SignInWithUserAuthCard({ config, onTokens }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [preferred, setPreferred] = useState<
    "EMAIL_OTP" | "SMS_OTP" | "PASSWORD" | "PASSWORD_SRP" | "WEB_AUTHN" | ""
  >("PASSWORD");
  const [otpPending, setOtpPending] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpResolve, setOtpResolve] = useState<((code: string) => void) | null>(null);
  const api = useApiCall<AuthTokens>();

  function askForOtp(): Promise<string> {
    return new Promise((resolve) => {
      setOtpInput("");
      setOtpPending(true);
      setOtpResolve(() => resolve);
    });
  }

  function submitOtp() {
    setOtpPending(false);
    otpResolve?.(otpInput);
    setOtpResolve(null);
  }

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      const result = await client.signInWithUserAuth({
        username,
        preferredChallenge: preferred || undefined,
        password: password || undefined,
        onChallenge: {
          emailOtp: async () => {
            return askForOtp();
          },
          smsOtp: async () => {
            return askForOtp();
          },
          password: async () => {
            const pwd = window.prompt("Enter password:");
            return pwd ?? "";
          },
          mfaCode: async () => {
            const code = window.prompt("Enter MFA code (TOTP/SMS):");
            return code ?? "";
          },
          newPassword: async () => {
            const pwd = window.prompt("Enter new password:");
            return pwd ?? "";
          },
          selectChallenge: async (available) => {
            const selected = window.prompt(
              `Select challenge (available: ${available.join(", ")}):`
            );
            return selected ?? available[0] ?? "";
          },
          webAuthn: async (options) => {
            if (!window.PublicKeyCredential) {
              throw new Error(
                "WebAuthn not supported in this environment (requires HTTPS + compatible device)"
              );
            }
            const credential = await navigator.credentials.get({
              publicKey: options as unknown as PublicKeyCredentialRequestOptions,
            });
            if (!credential) throw new Error("No credential returned from WebAuthn");
            const pk = credential as PublicKeyCredential;
            const resp = pk.response as AuthenticatorAssertionResponse;
            return {
              id: pk.id,
              rawId: btoa(String.fromCharCode(...new Uint8Array(pk.rawId))),
              type: pk.type,
              response: {
                clientDataJSON: btoa(
                  String.fromCharCode(...new Uint8Array(resp.clientDataJSON))
                ),
                authenticatorData: btoa(
                  String.fromCharCode(...new Uint8Array(resp.authenticatorData))
                ),
                signature: btoa(String.fromCharCode(...new Uint8Array(resp.signature))),
                userHandle: resp.userHandle
                  ? btoa(String.fromCharCode(...new Uint8Array(resp.userHandle)))
                  : null,
              },
            };
          },
        },
      });
      onTokens(result);
      return result;
    });
  }

  return (
    <DemoCard
      title="signInWithUserAuth (USER_AUTH flow)"
      signature="client.signInWithUserAuth({ username, preferredChallenge?, password?, onChallenge? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Preferred Challenge
          </span>
          <select
            value={preferred}
            onChange={(e) =>
              setPreferred(
                e.target.value as typeof preferred
              )
            }
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5 w-full max-w-xs"
          >
            <option value="">— none —</option>
            <option value="PASSWORD">PASSWORD</option>
            <option value="PASSWORD_SRP">PASSWORD_SRP</option>
            <option value="EMAIL_OTP">EMAIL_OTP</option>
            <option value="SMS_OTP">SMS_OTP</option>
            <option value="WEB_AUTHN">WEB_AUTHN</option>
          </select>
        </label>
        {(preferred === "PASSWORD" || preferred === "PASSWORD_SRP") && (
          <Field
            label="Password (optional — can be supplied via onChallenge)"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />
        )}
        {preferred === "WEB_AUTHN" && (
          <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs">
            Uses <code>navigator.credentials.get()</code> — requires HTTPS and a
            WebAuthn-enabled device/browser.
          </p>
        )}
      </div>

      {/* Inline OTP input */}
      {otpPending && (
        <div className="mt-3 p-3 rounded border border-blue-400 bg-blue-50 dark:bg-blue-950 flex flex-col gap-2 max-w-xs">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            OTP code sent — enter it below:
          </span>
          <input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            placeholder="123456"
            className="rounded border border-blue-300 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5"
            onKeyDown={(e) => e.key === "Enter" && submitOtp()}
            autoFocus
          />
          <button
            onClick={submitOtp}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Submit OTP
          </button>
        </div>
      )}

      <Btn onClick={run} disabled={api.loading || otpPending}>
        {api.loading ? "Running..." : "Run signInWithUserAuth"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- refreshTokens ----

function RefreshTokensCard({ config, tokens, onTokens }: Props) {
  const [refreshToken, setRefreshToken] = useState("");
  const api = useApiCall<AuthTokens>();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      const rt = refreshToken || tokens.refreshToken;
      const result = await client.refreshTokens({ refreshToken: rt });
      onTokens(result);
      return result;
    });
  }

  return (
    <DemoCard title="refreshTokens" signature="client.refreshTokens({ refreshToken })">
      <Field
        label="Refresh Token (blank = use stored token)"
        value={refreshToken}
        onChange={setRefreshToken}
        placeholder="auto-filled from signIn"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run refreshTokens"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- signOut ----

function SignOutCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [global_, setGlobal] = useState(false);
  const api = useApiCall<void>();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.signOut({
        accessToken: accessToken || tokens.accessToken,
        global: global_,
        refreshToken: refreshToken || tokens.refreshToken || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="signOut"
      signature="client.signOut({ accessToken, global?, refreshToken? })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field
          label="Refresh Token (optional)"
          value={refreshToken}
          onChange={setRefreshToken}
          placeholder="auto-filled from signIn"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 mt-1">
          <input
            type="checkbox"
            checked={global_}
            onChange={(e) => setGlobal(e.target.checked)}
            className="rounded"
          />
          Global sign out
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run signOut"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- Main export ----

export function AuthSection(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SignInCard {...props} />
      <SignInWithPasswordCard {...props} />
      <SignInWithUserAuthCard {...props} />
      <RefreshTokensCard {...props} />
      <SignOutCard {...props} />
    </div>
  );
}
