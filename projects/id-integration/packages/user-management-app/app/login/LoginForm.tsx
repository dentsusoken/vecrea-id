"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const signInHref = "/api/auth/sign-in";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          サインイン
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Amazon Cognito のマネージドログイン画面へ移動します。ユーザープールに
          Cognito ドメインと OAuth コールバック URL を設定してください。
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {errorDescription
            ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
            : error}
        </p>
      ) : null}

      <a
        href={signInHref}
        className="flex h-12 w-full items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Cognito で続行
      </a>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-600 dark:text-zinc-400">読み込み中…</div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}