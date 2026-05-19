"use client";

import { useState } from "react";
import type { CognitoConfig, AdminConfig, Tokens } from "./shared";
import { Field } from "./shared";
import { AuthSection } from "./AuthSection";
import { SignUpSection } from "./SignUpSection";
import { PasswordSection } from "./PasswordSection";
import { UserSection } from "./UserSection";
import { MfaSection } from "./MfaSection";
import { DeviceSection } from "./DeviceSection";
import { AdminSection } from "./AdminSection";
import { WebAuthnSection } from "./WebAuthnSection";

const TABS = ["Auth", "Sign Up", "Password", "User", "MFA", "WebAuthn", "Device", "Admin"] as const;
type Tab = (typeof TABS)[number];

const ENV_CONFIG: CognitoConfig = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "",
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
};

// ---- Config Panels ----

function TokensPanel({ tokens, onChange }: { tokens: Tokens; onChange: (t: Tokens) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Stored Tokens
        </h2>
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-xs text-blue-500 hover:underline"
        >
          {expanded ? "Hide" : "Show / Edit"}
        </button>
      </div>
      {!expanded && (tokens.accessToken || tokens.refreshToken) && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          Tokens present — auto-filling access/refresh token fields.
        </p>
      )}
      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          <Field
            label="Access Token"
            value={tokens.accessToken}
            onChange={(v) => onChange({ ...tokens, accessToken: v })}
            placeholder="eyJ..."
          />
          <Field
            label="ID Token"
            value={tokens.idToken}
            onChange={(v) => onChange({ ...tokens, idToken: v })}
            placeholder="eyJ..."
          />
          <Field
            label="Refresh Token"
            value={tokens.refreshToken}
            onChange={(v) => onChange({ ...tokens, refreshToken: v })}
            placeholder="eyJ..."
          />
        </div>
      )}
    </div>
  );
}

function AdminConfigPanel({
  adminConfig,
  onChange,
}: {
  adminConfig: AdminConfig;
  onChange: (c: AdminConfig) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
        Admin Config (IAM Credentials)
      </h2>
      <div className="flex flex-wrap gap-3">
        <Field
          label="Region"
          value={adminConfig.region}
          onChange={(v) => onChange({ ...adminConfig, region: v })}
          placeholder="us-east-1"
        />
        <Field
          label="User Pool ID"
          value={adminConfig.userPoolId}
          onChange={(v) => onChange({ ...adminConfig, userPoolId: v })}
          placeholder="us-east-1_xxxxxxxxx"
        />
        <Field
          label="Access Key ID"
          value={adminConfig.credentials.accessKeyId}
          onChange={(v) =>
            onChange({
              ...adminConfig,
              credentials: { ...adminConfig.credentials, accessKeyId: v },
            })
          }
          placeholder="AKIA..."
        />
        <Field
          label="Secret Access Key"
          value={adminConfig.credentials.secretAccessKey}
          onChange={(v) =>
            onChange({
              ...adminConfig,
              credentials: { ...adminConfig.credentials, secretAccessKey: v },
            })
          }
          type="password"
          placeholder="••••••••"
        />
        <Field
          label="Session Token (optional)"
          value={adminConfig.credentials.sessionToken ?? ""}
          onChange={(v) =>
            onChange({
              ...adminConfig,
              credentials: {
                ...adminConfig.credentials,
                sessionToken: v || undefined,
              },
            })
          }
          placeholder="FQo..."
        />
      </div>
    </div>
  );
}

// ---- Tab Bar ----

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 flex-wrap border-b border-zinc-200 dark:border-zinc-700 pb-0">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === t
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ---- Main DemoApp ----

export function DemoApp() {
  const [activeTab, setActiveTab] = useState<Tab>("Auth");

  const config = ENV_CONFIG;

  const [tokens, setTokens] = useState<Tokens>({
    accessToken: "",
    idToken: "",
    refreshToken: "",
  });

  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    region: "",
    userPoolId: "",
    credentials: {
      accessKeyId: "",
      secretAccessKey: "",
    },
  });

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            @vecrea/cognito-sdk — Demo
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Interactive explorer for all SDK APIs
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Always-visible config panels */}
        {activeTab !== "Admin" ? (
          <TokensPanel tokens={tokens} onChange={setTokens} />
        ) : (
          <AdminConfigPanel adminConfig={adminConfig} onChange={setAdminConfig} />
        )}

        {/* Tab navigation */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div>
          {activeTab === "Auth" && (
            <AuthSection config={config} tokens={tokens} onTokens={setTokens} />
          )}
          {activeTab === "Sign Up" && <SignUpSection config={config} onTokens={setTokens} />}
          {activeTab === "Password" && <PasswordSection config={config} tokens={tokens} />}
          {activeTab === "User" && <UserSection config={config} tokens={tokens} />}
          {activeTab === "MFA" && <MfaSection config={config} tokens={tokens} />}
          {activeTab === "WebAuthn" && <WebAuthnSection config={config} tokens={tokens} />}
          {activeTab === "Device" && <DeviceSection config={config} tokens={tokens} />}
          {activeTab === "Admin" && (
            <AdminSection adminConfig={adminConfig} clientId={config.clientId} />
          )}
        </div>
      </main>
    </div>
  );
}
