"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createCognitoClient } from "@vecrea/cognito-sdk/client";
import type { AuthTokens, PasskeyInfo } from "@vecrea/cognito-sdk/client";
import type { CognitoConfig } from "./shared";

// ---- Config ----

const CONFIG: CognitoConfig = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "",
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
};

// ---- Token persistence ----

const TOKEN_STORAGE_KEY = "cognito_tokens";

function loadStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

function persistTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function clearStoredTokens() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ---- JWT helpers ----

function decodeIdToken(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1] ?? "";
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

// ---- Primitives ----

function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-300 bg-white text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full placeholder:text-zinc-400"
      />
    </label>
  );
}

function PrimaryBtn({
  onClick,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const cls: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-zinc-900 hover:bg-zinc-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "border border-zinc-300 hover:bg-zinc-50 text-zinc-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full ${cls[variant]}`}
    >
      {children}
    </button>
  );
}

function formatCognitoError(e: unknown, context?: "migrate" | "passkey"): string {
  // Custom JS errors (e.g. passkey-not-registered check in selectChallenge) — use as-is
  if (e instanceof Error && !(e as { code?: string }).code) {
    return e.message;
  }

  const code = (e as { code?: string }).code ?? "";

  if (context === "migrate") {
    if (code === "UserNotFoundException" || code === "NotAuthorizedException") {
      return "ユーザー名またはパスワードが正しくありません";
    }
    if (code === "UserLambdaValidationException") {
      return "ユーザー移行に失敗しました。入力内容をご確認ください";
    }
  }

  const MESSAGES: Record<string, string> = {
    UserNotFoundException:        "このメールアドレスは登録されていません",
    NotAuthorizedException:       "認証に失敗しました。入力内容をご確認ください",
    UserNotConfirmedException:    "メールアドレスの確認が完了していません",
    CodeMismatchException:        "確認コードが正しくありません",
    ExpiredCodeException:         "確認コードの有効期限が切れています。再度お試しください",
    UsernameExistsException:      "このメールアドレスはすでに登録されています",
    TooManyRequestsException:     "試行回数が多すぎます。しばらく時間をおいて再度お試しください",
    LimitExceededException:       "試行回数の上限に達しました。しばらく時間をおいて再度お試しください",
    PasswordResetRequiredException: "パスワードのリセットが必要です",
    InvalidPasswordException:     "パスワードがポリシーを満たしていません",
    InvalidParameterException:    "入力内容に誤りがあります",
    UserLambdaValidationException: "処理に失敗しました。入力内容をご確認ください",
    WebAuthnRequiresHTTPS:        "パスキーにはHTTPS接続が必要です（localhost は除く）",
  };

  return MESSAGES[code] ?? "エラーが発生しました。しばらく時間をおいて再度お試しください";
}

function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
      {msg}
    </p>
  );
}

// ---- Sign In form ----

function SignInForm({ onSignIn }: { onSignIn: (t: AuthTokens) => void }) {
  const [email, setEmail] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpResolve, setOtpResolve] = useState<((code: string) => void) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function askOtp(): Promise<string> {
    return new Promise((resolve) => {
      setOtp("");
      setOtpPending(true);
      setLoading(false);
      setOtpResolve(() => resolve);
    });
  }

  function submitOtp() {
    setLoading(true);
    setOtpPending(false);
    otpResolve?.(otp);
    setOtpResolve(null);
  }

  async function run(preferredChallenge: "WEB_AUTHN" | "EMAIL_OTP") {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      const result = await client.signInWithUserAuth({
        username: email,
        preferredChallenge,
        onChallenge: {
          emailOtp: () => askOtp(),
          selectChallenge: async (available) => {
            if (preferredChallenge === "WEB_AUTHN") {
              if (!available.includes("WEB_AUTHN")) {
                throw new Error(
                  "このアカウントにはパスキーが登録されていません。メールOTPでサインインしてください。",
                );
              }
              return "WEB_AUTHN";
            }
            return "EMAIL_OTP";
          },
        },
      });
      onSignIn(result);
    } catch (e) {
      setError(formatCognitoError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="メールアドレス"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="user@example.com"
        autoComplete="email webauthn"
      />

      {otpPending ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">メールに送信されたコードを入力してください。</p>
          <Input
            label="確認コード"
            value={otp}
            onChange={setOtp}
            placeholder="123456"
            autoComplete="one-time-code"
          />
          <PrimaryBtn onClick={submitOtp} disabled={!otp || loading}>
            確認
          </PrimaryBtn>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <PrimaryBtn onClick={() => run("WEB_AUTHN")} disabled={!email || loading} variant="secondary">
            {loading ? "処理中..." : "🔑 パスキーでサインイン"}
          </PrimaryBtn>
          <PrimaryBtn onClick={() => run("EMAIL_OTP")} disabled={!email || loading} variant="ghost">
            {loading ? "処理中..." : "✉ メールOTPでサインイン"}
          </PrimaryBtn>
        </div>
      )}

      <ErrorMsg msg={error} />
    </div>
  );
}

// ---- Sign Up form (Mail OTP) ----

function SignUpForm({ onSignIn }: { onSignIn: (t: AuthTokens) => void }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "confirm">("email");
  const [session, setSession] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSignUp() {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      const result = await client.signUp({ username: email, attributes: { email } });
      setSession(result.session);
      setStep("confirm");
    } catch (e) {
      setError(formatCognitoError(e));
    } finally {
      setLoading(false);
    }
  }

  async function runConfirm() {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      const tokens = await client.confirmSignUp({ username: email, code, session });
      onSignIn(tokens);
    } catch (e) {
      setError(formatCognitoError(e));
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-800">{email}</span> に確認コードを送信しました。
        </p>
        <Input
          label="確認コード"
          value={code}
          onChange={setCode}
          placeholder="123456"
          autoComplete="one-time-code"
        />
        <PrimaryBtn onClick={runConfirm} disabled={!code || loading}>
          {loading ? "処理中..." : "登録を完了"}
        </PrimaryBtn>
        <button
          onClick={() => setStep("email")}
          className="text-sm text-zinc-400 hover:text-zinc-600 hover:underline text-center"
        >
          ← メールアドレスを変更
        </button>
        <ErrorMsg msg={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="メールアドレス"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="user@example.com"
        autoComplete="email"
      />
      <PrimaryBtn onClick={runSignUp} disabled={!email || loading}>
        {loading ? "処理中..." : "確認コードを送信"}
      </PrimaryBtn>
      <ErrorMsg msg={error} />
    </div>
  );
}

// ---- Migration Sign In form (username + password) ----

function MigrateForm({ onSignIn }: { onSignIn: (t: AuthTokens) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      const result = await client.signInWithPassword({ username, password });
      onSignIn(result);
    } catch (e) {
      setError(formatCognitoError(e, "migrate"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="ユーザー名 / メールアドレス"
        value={username}
        onChange={setUsername}
        placeholder="user@example.com"
        autoComplete="username"
      />
      <Input
        label="パスワード"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <PrimaryBtn onClick={run} disabled={!username || !password || loading}>
        {loading ? "処理中..." : "サインイン（移行）"}
      </PrimaryBtn>
      <ErrorMsg msg={error} />
    </div>
  );
}

// ---- Passkey management ----

function PasskeyManager({ accessToken }: { accessToken: string }) {
  const [credentials, setCredentials] = useState<PasskeyInfo[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const client = createCognitoClient(CONFIG);
      const result = await client.listPasskeys({ accessToken });
      setCredentials(result.credentials);
    } catch (e) {
      setError(formatCognitoError(e));
    } finally {
      setLoadingList(false);
    }
  }, [accessToken]);

  // Load on first render
  useState(() => {
    fetchList();
  });

  async function handleRegister() {
    setError(null);
    setLoadingReg(true);
    try {
      const client = createCognitoClient(CONFIG);
      await client.registerPasskey({ accessToken });
      await fetchList();
    } catch (e) {
      setError(formatCognitoError(e, "passkey"));
    } finally {
      setLoadingReg(false);
    }
  }

  async function handleDelete(credentialId: string) {
    setError(null);
    setDeletingId(credentialId);
    try {
      const client = createCognitoClient(CONFIG);
      await client.deletePasskey({ accessToken, credentialId });
      setCredentials((prev) => prev?.filter((c) => c.credentialId !== credentialId) ?? null);
    } catch (e) {
      setError(formatCognitoError(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">パスキー</h3>
        <button
          onClick={fetchList}
          disabled={loadingList}
          className="text-xs text-blue-500 hover:underline disabled:opacity-40"
        >
          {loadingList ? "読み込み中..." : "更新"}
        </button>
      </div>

      {credentials !== null && credentials.length === 0 && (
        <p className="text-sm text-zinc-400">登録済みパスキーはありません。</p>
      )}

      {credentials?.map((c) => (
        <div
          key={c.credentialId}
          className="flex items-start justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-800 truncate">
              {c.friendlyName || "パスキー"}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {c.authenticatorAttachment === "platform" ? "デバイス内蔵" : c.authenticatorAttachment ?? "—"}
              {" · "}
              登録日: {c.createdAt.toLocaleDateString("ja-JP")}
            </p>
          </div>
          <button
            onClick={() => handleDelete(c.credentialId)}
            disabled={deletingId === c.credentialId}
            className="text-xs text-red-500 hover:underline disabled:opacity-40 shrink-0 mt-0.5"
          >
            {deletingId === c.credentialId ? "削除中..." : "削除"}
          </button>
        </div>
      ))}

      <PrimaryBtn onClick={handleRegister} disabled={loadingReg} variant="ghost">
        {loadingReg ? "登録中..." : "+ パスキーを登録"}
      </PrimaryBtn>

      <ErrorMsg msg={error} />
    </div>
  );
}

// ---- Delete account ----

function DeleteAccountSection({
  accessToken,
  onDeleted,
}: {
  accessToken: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      await client.deleteUser({ accessToken });
      onDeleted();
    } catch (e) {
      setError(formatCognitoError(e));
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-red-400">危険な操作</h2>
      {!confirming ? (
        <PrimaryBtn onClick={() => setConfirming(true)} variant="danger">
          アカウントを削除
        </PrimaryBtn>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600">
            この操作は取り消せません。アカウントとすべてのデータが完全に削除されます。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirming(false); setError(null); }}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "削除中..." : "削除する"}
            </button>
          </div>
        </div>
      )}
      <ErrorMsg msg={error} />
    </div>
  );
}

// ---- Passkey prompt (shown once after sign-up) ----

function PasskeyPromptScreen({
  tokens,
  onContinue,
}: {
  tokens: AuthTokens;
  onContinue: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      const client = createCognitoClient(CONFIG);
      await client.registerPasskey({ accessToken: tokens.accessToken });
      onContinue();
    } catch (e) {
      setError(formatCognitoError(e, "passkey"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="text-5xl">🔑</div>
          <h1 className="text-xl font-bold text-zinc-900">パスキーを登録しませんか？</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            次回から指紋や顔認証でかんたんにサインインできます。
            <br />
            あとで設定画面からでも登録できます。
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-5 flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm text-zinc-600 mb-1">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> パスワード不要でサインイン
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> フィッシング耐性あり
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 生体認証・PIN で本人確認
            </li>
          </ul>
          <PrimaryBtn onClick={handleRegister} disabled={loading}>
            {loading ? "登録中..." : "パスキーを登録する"}
          </PrimaryBtn>
          <PrimaryBtn onClick={onContinue} disabled={loading} variant="ghost">
            あとで登録する
          </PrimaryBtn>
          <ErrorMsg msg={error} />
        </div>
      </div>
    </div>
  );
}

// ---- Login modal ----

type Tab = "signin" | "signup" | "migrate";

const TABS: { id: Tab; label: string }[] = [
  { id: "signin", label: "サインイン" },
  { id: "signup", label: "新規登録" },
  { id: "migrate", label: "ユーザー移行" },
];

function LoginModal({
  onClose,
  onSignIn,
  onSignUp,
}: {
  onClose: () => void;
  onSignIn: (t: AuthTokens) => void;
  onSignUp: (t: AuthTokens) => void;
}) {
  const [tab, setTab] = useState<Tab>("signin");

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <span className="text-base font-bold text-zinc-900">VeCrea</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-zinc-200 mt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-px bg-white"
                  : "text-zinc-400 hover:text-zinc-700 bg-zinc-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === "signin" && <SignInForm onSignIn={onSignIn} />}
          {tab === "signup" && <SignUpForm onSignIn={onSignUp} />}
          {tab === "migrate" && <MigrateForm onSignIn={onSignUp} />}
        </div>

        <p className="text-center text-xs text-zinc-400 pb-4">
          開発者ツールは{" "}
          <a href="/demo" className="text-blue-500 hover:underline">
            /demo
          </a>{" "}
          で利用できます
        </p>
      </div>
    </div>
  );
}

// ---- Home screen ----

function HomeScreen({
  tokens,
  onLoginClick,
  onAccountClick,
  onSignOut,
}: {
  tokens: AuthTokens | null;
  onLoginClick: () => void;
  onAccountClick: () => void;
  onSignOut: () => void;
}) {
  const email = tokens ? (decodeIdToken(tokens.idToken).email as string) ?? "" : "";
  const initial = email ? email[0].toUpperCase() : "?";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    setDropdownOpen(false);
    try {
      if (tokens) {
        const client = createCognitoClient(CONFIG);
        await client.signOut({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      }
    } catch {
      // ignore
    } finally {
      onSignOut();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-zinc-900">VeCrea</span>
          <div className="flex items-center gap-3">
            {tokens ? (
              <div className="relative" ref={dropdownRef}>
                {/* Avatar button */}
                <button
                  onClick={() => setDropdownOpen((x) => !x)}
                  className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center transition-colors"
                  aria-label="アカウントメニュー"
                >
                  {initial}
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden z-20">
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <p className="text-xs text-zinc-400">サインイン中</p>
                      <p className="text-sm font-medium text-zinc-800 truncate mt-0.5">{email}</p>
                    </div>
                    <button
                      onClick={() => { setDropdownOpen(false); onAccountClick(); }}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      アカウント管理
                    </button>
                    <div className="border-t border-zinc-100" />
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      {signingOut ? "処理中..." : "サインアウト"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                ログイン / 新規登録
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <div className="bg-zinc-900 text-white">
          <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col gap-5">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              2026 Summer Collection
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              あたらしい季節の<br />スタイルを見つけよう
            </h2>
            <p className="text-zinc-400 max-w-md text-sm leading-relaxed">
              上質な素材と洗練されたデザイン。日常をワンランク上げる新作が揃いました。
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={tokens ? undefined : onLoginClick}
                className="rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 font-semibold text-sm px-6 py-3 transition-colors"
              >
                {tokens ? "新作をみる" : "ログインして購入する"}
              </button>
              <button className="rounded-lg border border-zinc-600 hover:border-zinc-400 text-white text-sm font-medium px-6 py-3 transition-colors">
                コレクションを見る
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 flex gap-6 overflow-x-auto text-sm font-medium text-zinc-600">
            {["すべて", "レディース", "メンズ", "アクセサリー", "シューズ", "セール"].map((cat, i) => (
              <button
                key={cat}
                className={`py-4 shrink-0 border-b-2 transition-colors ${
                  i === 0
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent hover:text-zinc-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="max-w-5xl mx-auto px-4 py-10">
          {tokens && (
            <p className="text-sm text-zinc-500 mb-6">
              おかえりなさい、<span className="font-medium text-zinc-800">{email.split("@")[0]}</span> さん
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {MOCK_PRODUCTS.map((p) => (
              <div key={p.id} className="group flex flex-col gap-2">
                <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ${p.bg}`}>
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">
                    {p.emoji}
                  </div>
                  {p.tag && (
                    <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.tag === "SALE"
                        ? "bg-red-500 text-white"
                        : "bg-zinc-900 text-white"
                    }`}>
                      {p.tag}
                    </span>
                  )}
                  <button
                    onClick={tokens ? undefined : onLoginClick}
                    className="absolute bottom-3 inset-x-3 bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {tokens ? "カートに追加" : "ログインして購入"}
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800 truncate">{p.name}</p>
                  <p className="text-sm text-zinc-500">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white mt-10">
          <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <span className="font-bold text-zinc-900">VeCrea</span>
            <span>© 2026 VeCrea. このサイトはデモ用サンプルです。</span>
            <a href="/demo" className="text-blue-500 hover:underline">開発者ツール (/demo)</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

const MOCK_PRODUCTS = [
  { id: 1, name: "クラシックレザーバッグ", price: "¥28,600", bg: "bg-stone-100", emoji: "👜", tag: "NEW" },
  { id: 2, name: "ウールブレンドコート", price: "¥54,800", bg: "bg-zinc-100", emoji: "🧥" },
  { id: 3, name: "キャンバススニーカー", price: "¥18,700", bg: "bg-blue-50", emoji: "👟", tag: "SALE" },
  { id: 4, name: "リネンシャツ", price: "¥12,100", bg: "bg-amber-50", emoji: "👔" },
  { id: 5, name: "デニムジャケット", price: "¥32,400", bg: "bg-indigo-50", emoji: "🫥", tag: "NEW" },
  { id: 6, name: "レザーウォレット", price: "¥15,800", bg: "bg-orange-50", emoji: "👛" },
];

// ---- Account screen ----

function AccountScreen({
  tokens,
  onBack,
  onSignOut,
}: {
  tokens: AuthTokens;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const claims = decodeIdToken(tokens.idToken);
  const email = (claims.email as string) ?? "";
  const sub = (claims.sub as string) ?? "";
  const exp = claims.exp ? new Date((claims.exp as number) * 1000) : null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const client = createCognitoClient(CONFIG);
      await client.signOut({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch {
      // ignore
    } finally {
      onSignOut();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              ← ホーム
            </button>
            <span className="text-zinc-300">|</span>
            <span className="text-sm font-medium text-zinc-700">{email}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-sm text-red-500 hover:underline disabled:opacity-40"
          >
            {signingOut ? "サインアウト中..." : "サインアウト"}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        {/* User info */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
            ユーザー情報
          </h2>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 text-sm">
              <span className="text-zinc-400 w-16 shrink-0">メール</span>
              <span className="text-zinc-800 font-mono truncate">{email}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-zinc-400 w-16 shrink-0">Sub</span>
              <span className="text-zinc-700 font-mono truncate text-xs">{sub}</span>
            </div>
            {exp && (
              <div className="flex gap-2 text-sm">
                <span className="text-zinc-400 w-16 shrink-0">有効期限</span>
                <span className="text-zinc-700 text-xs">{exp.toLocaleString("ja-JP")}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowTokens((x) => !x)}
            className="text-xs text-blue-500 hover:underline self-start mt-1"
          >
            {showTokens ? "トークンを隠す" : "トークンを表示"}
          </button>
          {showTokens && (
            <div className="flex flex-col gap-2 mt-1">
              {(
                [
                  ["Access Token", tokens.accessToken],
                  ["ID Token", tokens.idToken],
                  ["Refresh Token", tokens.refreshToken],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-zinc-500 mb-0.5">{label}</p>
                  <p className="text-xs font-mono text-zinc-700 break-all bg-zinc-50 border border-zinc-200 rounded px-2 py-1">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passkey management */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
            パスキー管理
          </h2>
          <PasskeyManager accessToken={tokens.accessToken} />
        </div>

        {/* Danger zone */}
        <DeleteAccountSection accessToken={tokens.accessToken} onDeleted={onSignOut} />
      </main>
    </div>
  );
}

// ---- Root ----

export function LoginApp() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"home" | "account">("home");
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    async function restore() {
      const saved = loadStoredTokens();
      if (!saved) {
        setRestoring(false);
        return;
      }

      const claims = decodeIdToken(saved.idToken);
      const exp = claims.exp as number | undefined;
      const isExpired = !exp || exp * 1000 < Date.now();

      if (!isExpired) {
        setTokens(saved);
        setRestoring(false);
        return;
      }

      try {
        const client = createCognitoClient(CONFIG);
        const refreshed = await client.refreshTokens({ refreshToken: saved.refreshToken });
        persistTokens(refreshed);
        setTokens(refreshed);
      } catch {
        clearStoredTokens();
      } finally {
        setRestoring(false);
      }
    }
    restore();
  }, []);

  function handleSignIn(t: AuthTokens) {
    persistTokens(t);
    setShowPasskeyPrompt(false);
    setModalOpen(false);
    setTokens(t);
  }

  function handleSignUp(t: AuthTokens) {
    persistTokens(t);
    setModalOpen(false);
    setShowPasskeyPrompt(true);
    setTokens(t);
  }

  function handleSignOut() {
    clearStoredTokens();
    setShowPasskeyPrompt(false);
    setView("home");
    setTokens(null);
  }

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (showPasskeyPrompt && tokens) {
    return (
      <PasskeyPromptScreen
        tokens={tokens}
        onContinue={() => setShowPasskeyPrompt(false)}
      />
    );
  }

  if (view === "account" && tokens) {
    return (
      <AccountScreen
        tokens={tokens}
        onBack={() => setView("home")}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <>
      <HomeScreen
        tokens={tokens}
        onLoginClick={() => setModalOpen(true)}
        onAccountClick={() => setView("account")}
        onSignOut={handleSignOut}
      />
      {modalOpen && !tokens && (
        <LoginModal
          onClose={() => setModalOpen(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      )}
    </>
  );
}
