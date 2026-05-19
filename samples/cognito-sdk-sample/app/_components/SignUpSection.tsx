"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import type { AuthTokens } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  onTokens?: (t: Tokens) => void;
}

function SignUpFlowCard({ config, onTokens }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"signUp" | "confirm">("signUp");
  const [pendingSession, setPendingSession] = useState<string | undefined>();

  const signUpApi = useApiCall<{ userSub: string; userConfirmed: boolean; session?: string }>();
  const confirmApi = useApiCall<AuthTokens>();

  function runSignUp() {
    signUpApi.run(async () => {
      const client = createCognitoClient(config);
      const result = await client.signUp({
        username,
        password: password || undefined,
        attributes: email ? { email } : undefined,
      });
      setPendingSession(result.session);
      if (!result.userConfirmed) setStep("confirm");
      return result;
    });
  }

  function runConfirm() {
    confirmApi.run(async () => {
      const client = createCognitoClient(config);
      const tokens = await client.confirmSignUp({
        username,
        code,
        session: pendingSession,
      });
      onTokens?.({
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
      });
      return tokens;
    });
  }

  function reset() {
    setStep("signUp");
    setCode("");
    setPendingSession(undefined);
    signUpApi.reset();
    confirmApi.reset();
  }

  return (
    <DemoCard
      title="signUp → confirmSignUp (auto sign-in)"
      signature="client.signUp(...) → client.confirmSignUp({ session })"
    >
      {step === "signUp" ? (
        <>
          <div className="flex flex-col gap-2">
            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="user@example.com"
            />
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
          <Btn onClick={runSignUp} disabled={signUpApi.loading}>
            {signUpApi.loading ? "Running..." : "Run signUp"}
          </Btn>
          <ResultBox result={signUpApi.result} error={signUpApi.error} />
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            OTP sent to <strong className="text-zinc-700 dark:text-zinc-200">{username}</strong>.
            Enter the code to confirm and sign in automatically.
          </p>
          <Field label="Confirmation Code" value={code} onChange={setCode} placeholder="123456" />
          <div className="flex gap-2">
            <Btn onClick={runConfirm} disabled={confirmApi.loading}>
              {confirmApi.loading ? "Running..." : "Confirm & Sign In"}
            </Btn>
            <Btn variant="secondary" onClick={reset}>
              Back
            </Btn>
          </div>
          <ResultBox result={confirmApi.result} error={confirmApi.error} />
        </>
      )}
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
      <Field
        label="Username"
        value={username}
        onChange={setUsername}
        placeholder="user@example.com"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run resendConfirmationCode"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function SignUpSection({ config, onTokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SignUpFlowCard config={config} onTokens={onTokens} />
      <ResendConfirmationCodeCard config={config} />
    </div>
  );
}
