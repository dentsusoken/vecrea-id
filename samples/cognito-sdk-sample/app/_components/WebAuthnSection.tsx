"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
}

function RegisterPasskeyCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.registerPasskey({
        accessToken: accessToken || tokens.accessToken,
      });
    });
  }

  return (
    <DemoCard
      title="registerPasskey"
      signature="client.registerPasskey({ accessToken })"
    >
      <Field
        label="Access Token (blank = use stored)"
        value={accessToken}
        onChange={setAccessToken}
        placeholder="auto-filled from signIn"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Registering..." : "Run registerPasskey"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function WebAuthnSection({ config, tokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <RegisterPasskeyCard config={config} tokens={tokens} />
    </div>
  );
}
