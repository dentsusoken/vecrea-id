"use client";

import Link from "next/link";

const linkClassName =
  "text-sm font-medium text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 rounded-sm";

type SignInBackToHomeProps =
  | { mode: "web" }
  | { mode: "app"; href: string };

/**
 * Web: デモホーム (`/`)。インナーブラウザ（Expo）では信頼済みディープリンクで
 * アプリのルートへ戻す。
 */
export function SignInBackToHome(props: SignInBackToHomeProps) {
  if (props.mode === "app") {
    return (
      <a className={linkClassName} href={props.href}>
        Back to app home
      </a>
    );
  }

  return (
    <Link className={linkClassName} href="/" prefetch={true}>
      Back to Demo Home
    </Link>
  );
}
