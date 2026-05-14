"use client";

import { useState } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { CognitoConfig, Tokens } from "./shared";

interface Props {
  config: CognitoConfig;
  tokens: Tokens;
}

function ListDevicesCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [limit, setLimit] = useState("10");
  const [paginationToken, setPaginationToken] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      return await client.listDevices({
        accessToken: accessToken || tokens.accessToken,
        limit: limit ? Number(limit) : undefined,
        paginationToken: paginationToken || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="listDevices"
      signature="client.listDevices({ accessToken, limit?, paginationToken? })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Limit" value={limit} onChange={setLimit} placeholder="10" />
        <Field
          label="Pagination Token (optional)"
          value={paginationToken}
          onChange={setPaginationToken}
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run listDevices"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function GetDeviceCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      return await client.getDevice({
        accessToken: accessToken || tokens.accessToken,
        deviceKey,
      });
    });
  }

  return (
    <DemoCard
      title="getDevice"
      signature="client.getDevice({ accessToken, deviceKey })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Device Key" value={deviceKey} onChange={setDeviceKey} placeholder="us-east-1_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run getDevice"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ForgetDeviceCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.forgetDevice({
        accessToken: accessToken || tokens.accessToken,
        deviceKey,
      });
    });
  }

  return (
    <DemoCard
      title="forgetDevice"
      signature="client.forgetDevice({ accessToken, deviceKey })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Device Key" value={deviceKey} onChange={setDeviceKey} />
      </div>
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run forgetDevice"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function UpdateDeviceStatusCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const [status, setStatus] = useState<"remembered" | "not_remembered">("remembered");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.updateDeviceStatus({
        accessToken: accessToken || tokens.accessToken,
        deviceKey,
        status,
      });
    });
  }

  return (
    <DemoCard
      title="updateDeviceStatus"
      signature='client.updateDeviceStatus({ accessToken, deviceKey, status: "remembered" | "not_remembered" })'
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Device Key" value={deviceKey} onChange={setDeviceKey} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "remembered" | "not_remembered")}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5 w-full max-w-xs"
          >
            <option value="remembered">remembered</option>
            <option value="not_remembered">not_remembered</option>
          </select>
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run updateDeviceStatus"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function ConfirmDeviceCard({ config, tokens }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const [friendlyDeviceName, setFriendlyDeviceName] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => {
      const client = createCognitoClient(config);
      await client.confirmDevice({
        accessToken: accessToken || tokens.accessToken,
        deviceKey,
        friendlyDeviceName: friendlyDeviceName || undefined,
      });
    });
  }

  return (
    <DemoCard
      title="confirmDevice"
      signature="client.confirmDevice({ accessToken, deviceKey, friendlyDeviceName? })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Access Token (blank = use stored)"
          value={accessToken}
          onChange={setAccessToken}
          placeholder="auto-filled from signIn"
        />
        <Field label="Device Key" value={deviceKey} onChange={setDeviceKey} />
        <Field
          label="Friendly Device Name (optional)"
          value={friendlyDeviceName}
          onChange={setFriendlyDeviceName}
          placeholder="My Laptop"
        />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run confirmDevice"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

export function DeviceSection({ config, tokens }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ListDevicesCard config={config} tokens={tokens} />
      <GetDeviceCard config={config} tokens={tokens} />
      <ForgetDeviceCard config={config} tokens={tokens} />
      <UpdateDeviceStatusCard config={config} tokens={tokens} />
      <ConfirmDeviceCard config={config} tokens={tokens} />
    </div>
  );
}
