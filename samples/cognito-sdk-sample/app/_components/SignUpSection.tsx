"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig } from "./shared";

interface Props {
  config: CognitoConfig;
}

function SignUpCard({ config }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      return await client.signUp({
        username,
        password: password || undefined,
        attributes: email ? { email } : undefined,
      });
    });
  }

  return (
    <DemoCard
      title="signUp"
      signature="client.signUp({ username, password?, attributes? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
        <Field
          label="Password (optional for passwordless pools)"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
        />
        <Field
          label="email attribute (optional)"
          value={email}
          onChange={setEmail}
          placeholder="user@example.com"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run signUp"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ConfirmSignUpCard({ config }: Props) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [forceAlias, setForceAlias] = useState(false);
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.confirmSignUp({
        username,
        code,
        forceAliasCreation: forceAlias || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="confirmSignUp"
      signature="client.confirmSignUp({ username, code, forceAliasCreation? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Confirmation Code" value={code} onChange={setCode} placeholder="123456" />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={forceAlias}
            onChange={(e) => setForceAlias(e.target.checked)}
          />
          Force alias creation
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run confirmSignUp"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ResendConfirmationCodeCard({ config }: Props) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.resendConfirmationCode({ username });
    });
  }

  return (
    <DemoCard
      title="resendConfirmationCode"
      signature="client.resendConfirmationCode({ username })"
    >
      <Field label="Username" value={username} onChange={setUsername} placeholder="user@example.com" />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run resendConfirmationCode"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function SignUpSection({ config }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SignUpCard config={config} />
      <ConfirmSignUpCard config={config} />
      <ResendConfirmationCodeCard config={config} />
    </div>
  );
}
