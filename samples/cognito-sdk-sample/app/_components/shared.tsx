"use client";

import { useState, useCallback } from "react";

// ---- Types ----

export interface Tokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

export interface AdminConfig {
  region: string;
  userPoolId: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

// ---- UI primitives ----

export function ResultBox({ result, error }: { result: unknown; error: string | null }) {
  if (error === null && result === undefined) return null;
  if (error) {
    return (
      <pre className="mt-3 overflow-auto max-h-48 rounded bg-red-950 text-red-300 text-xs p-3 font-mono">
        {error}
      </pre>
    );
  }
  return (
    <pre className="mt-3 overflow-auto max-h-48 rounded bg-zinc-900 text-green-400 text-xs p-3 font-mono">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export function DemoCard({
  title,
  signature,
  children,
}: {
  title: string;
  signature: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-1">{title}</h3>
      <code className="text-xs text-zinc-500 dark:text-zinc-400 block mb-3 font-mono">
        {signature}
      </code>
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-2.5 py-1.5 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

export function Btn({
  onClick,
  disabled,
  variant = "primary",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary";
  children: React.ReactNode;
}) {
  const base =
    "mt-3 px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary:
      "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ---- useApiCall hook ----

export interface ApiCallState<T> {
  loading: boolean;
  result: T | undefined;
  error: string | null;
  run: (fn: () => Promise<T>) => void;
  reset: () => void;
}

export function useApiCall<T = unknown>(): ApiCallState<T> {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((fn: () => Promise<T>) => {
    setLoading(true);
    setResult(undefined);
    setError(null);
    fn()
      .then((r) => {
        setResult(r === undefined ? (null as unknown as T) : r);
        setLoading(false);
      })
      .catch((e: unknown) => {
        const msg =
          e instanceof Error
            ? `${(e as { code?: string }).code ? `[${(e as { code?: string }).code}] ` : ""}${e.message}`
            : String(e);
        setError(msg);
        setLoading(false);
      });
  }, []);

  const reset = useCallback(() => {
    setResult(undefined);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
