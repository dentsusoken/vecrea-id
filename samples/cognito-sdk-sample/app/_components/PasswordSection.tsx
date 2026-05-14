"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
}

function ChangePasswordCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [previousPassword, setPreviousPassword] = useState("");
  const [proposedPassword, setProposedPassword] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.changePassword({
        accessToken: accessToken || tokens.accessToken,
        previousPassword,
        proposedPassword,
      });
    });
  }

  return (
    <DemoCard
      title="changePassword"
      signature="client.changePassword({ accessToken, previousPassword, proposedPassword })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field
          label="Current Password"
          value={previousPassword}
          onChange={setPreviousPassword}
          type="password"
          placeholder="••••••••"
        />
        <Field
          label="New Password"
          value={proposedPassword}
          onChange={setProposedPassword}
          type="password"
          placeholder="••••••••"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run changePassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ForgotPasswordCard({ config }: { config: CognitoConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.forgotPassword({ username });
    });
  }

  return (
    <DemoCard title="forgotPassword" signature="client.forgotPassword({ username })">
      <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run forgotPassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ConfirmForgotPasswordCard({ config }: { config: CognitoConfig }) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.confirmForgotPassword({ username, code, newPassword });
    });
  }

  return (
    <DemoCard
      title="confirmForgotPassword"
      signature="client.confirmForgotPassword({ username, code, newPassword })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Reset Code" value={code} onChange={setCode} placeholder="123456" />
        <Field
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          type="password"
          placeholder="••••••••"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run confirmForgotPassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function PasswordSection({ config, tokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ChangePasswordCard config={config} tokens={tokens} />
      <ForgotPasswordCard config={config} />
      <ConfirmForgotPasswordCard config={config} />
    </div>
  );
}
