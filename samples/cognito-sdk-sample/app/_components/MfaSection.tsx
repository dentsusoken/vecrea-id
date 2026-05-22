"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import type { MfaSetting } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
}

function AssociateTotpTokenCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const api = useApiCall<{ secretCode: string; session?: string }>();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      return await client.associateTotpToken({
        accessToken: accessToken || tokens.accessToken,
      });
    });
  }

  return (
    <DemoCard
      title="associateTotpToken"
      signature="client.associateTotpToken({ accessToken }) → { secretCode, session? }"
    >
      <Field
        label="Access Token (blank = use stored)"
        value={accessToken}
        onChange={setAccessToken}
        placeholder="auto-filled from signIn"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run associateTotpToken"}
      </Btn>
      {api.result && (
        <div className="mt-2 p-2 rounded bg-zinc-100 dark:bg-zinc-700 text-xs font-mono break-all max-w-xs">
          <div className="text-zinc-500 dark:text-zinc-400 mb-1">
            Secret Code (scan with authenticator app):
          </div>
          <div className="text-zinc-900 dark:text-zinc-100 font-bold">{api.result.secretCode}</div>
        </div>
      )}
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function VerifyTotpTokenCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [code, setCode] = useState("");
  const [friendlyDeviceName, setFriendlyDeviceName] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.verifyTotpToken({
        accessToken: accessToken || tokens.accessToken,
        code,
        friendlyDeviceName: friendlyDeviceName || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="verifyTotpToken"
      signature="client.verifyTotpToken({ accessToken, code, friendlyDeviceName? })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="TOTP Code" value={code} onChange={setCode} placeholder="123456" />
        <Field
          label="Friendly Device Name (optional)"
          value={friendlyDeviceName}
          onChange={setFriendlyDeviceName}
          placeholder="My Phone"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run verifyTotpToken"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

const MFA_SETTINGS: MfaSetting[] = ["ENABLED", "PREFERRED", "DISABLED"];

function SetMfaPreferenceCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [totp, setTotp] = useState<MfaSetting | "">("");
  const [sms, setSms] = useState<MfaSetting | "">("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.setMfaPreference({
        accessToken: accessToken || tokens.accessToken,
        totp: (totp as MfaSetting) || undefined,
        sms: (sms as MfaSetting) || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="setMfaPreference"
      signature='client.setMfaPreference({ accessToken, totp?, sms? })  // "ENABLED" | "PREFERRED" | "DISABLED"'
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">TOTP Setting</span>
          <select
            value={totp}
            onChange={(e) => setTotp(e.target.value as MfaSetting | "")}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5 w-full max-w-xs"
          >
            <option value="">— unchanged —</option>
            {MFA_SETTINGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">SMS Setting</span>
          <select
            value={sms}
            onChange={(e) => setSms(e.target.value as MfaSetting | "")}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5 w-full max-w-xs"
          >
            <option value="">— unchanged —</option>
            {MFA_SETTINGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run setMfaPreference"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function MfaSection({ config, tokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <AssociateTotpTokenCard config={config} tokens={tokens} />
      <VerifyTotpTokenCard config={config} tokens={tokens} />
      <SetMfaPreferenceCard config={config} tokens={tokens} />
    </div>
  );
}
