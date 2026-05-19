"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
}

function GetUserCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      return await client.getUser({ accessToken: accessToken || tokens.accessToken });
    });
  }

  return (
    <DemoCard title="getUser" signature="client.getUser({ accessToken })">
      <Field
        label="Access Token (blank = use stored)"
        value={accessToken}
        onChange={setAccessToken}
        placeholder="auto-filled from signIn"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run getUser"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function UpdateUserAttributesCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [attrKey, setAttrKey] = useState("name");
  const [attrValue, setAttrValue] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.updateUserAttributes({
        accessToken: accessToken || tokens.accessToken,
        attributes: { [attrKey]: attrValue },
      });
    });
  }

  return (
    <DemoCard
      title="updateUserAttributes"
      signature="client.updateUserAttributes({ accessToken, attributes })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Attribute Name" value={attrKey} onChange={setAttrKey} placeholder="name" />
        <Field
          label="Attribute Value"
          value={attrValue}
          onChange={setAttrValue}
          placeholder="John Doe"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run updateUserAttributes"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function DeleteUserAttributesCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [attributeNames, setAttributeNames] = useState("nickname");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.deleteUserAttributes({
        accessToken: accessToken || tokens.accessToken,
        attributeNames: attributeNames
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    });
  }

  return (
    <DemoCard
      title="deleteUserAttributes"
      signature="client.deleteUserAttributes({ accessToken, attributeNames })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field
          label="Attribute Names (comma-separated)"
          value={attributeNames}
          onChange={setAttributeNames}
          placeholder="nickname, picture"
        />
      </div>
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run deleteUserAttributes"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function GetAttributeVerificationCodeCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [attributeName, setAttributeName] = useState("email");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.getAttributeVerificationCode({
        accessToken: accessToken || tokens.accessToken,
        attributeName,
      });
    });
  }

  return (
    <DemoCard
      title="getAttributeVerificationCode"
      signature="client.getAttributeVerificationCode({ accessToken, attributeName })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field
          label="Attribute Name"
          value={attributeName}
          onChange={setAttributeName}
          placeholder="email"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run getAttributeVerificationCode"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function VerifyAttributeCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [attributeName, setAttributeName] = useState("email");
  const [code, setCode] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.verifyAttribute({
        accessToken: accessToken || tokens.accessToken,
        attributeName,
        code,
      });
    });
  }

  return (
    <DemoCard
      title="verifyAttribute"
      signature="client.verifyAttribute({ accessToken, attributeName, code })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field
          label="Attribute Name"
          value={attributeName}
          onChange={setAttributeName}
          placeholder="email"
        />
        <Field label="Verification Code" value={code} onChange={setCode} placeholder="123456" />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run verifyAttribute"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function DeleteUserCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const api = useApiCall();

  function run() {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone."))
      return;
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.deleteUser({ accessToken: accessToken || tokens.accessToken });
    });
  }

  return (
    <DemoCard title="deleteUser" signature="client.deleteUser({ accessToken })">
      <Field
        label="Access Token (blank = use stored)"
        value={accessToken}
        onChange={setAccessToken}
        placeholder="auto-filled from signIn"
      />
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run deleteUser (irreversible)"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function UserSection({ config, tokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <GetUserCard config={config} tokens={tokens} />
      <UpdateUserAttributesCard config={config} tokens={tokens} />
      <DeleteUserAttributesCard config={config} tokens={tokens} />
      <GetAttributeVerificationCodeCard config={config} tokens={tokens} />
      <VerifyAttributeCard config={config} tokens={tokens} />
      <DeleteUserCard config={config} tokens={tokens} />
    </div>
  );
}
