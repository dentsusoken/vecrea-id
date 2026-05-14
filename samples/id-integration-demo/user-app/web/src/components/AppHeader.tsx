"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth-client";
import { SignOutButton } from "./auth/SignOutButton";

export function AppHeader() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <header className="flex items-center justify-end gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-200" aria-hidden />
      </header>
    );
  }

  if (!session?.user) {
    return (
      <header className="flex items-center justify-end gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-800 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          href="/sign-in"
          prefetch={true}
        >
          Sign in
        </Link>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-end gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <SignOutButton />
    </header>
  );
}
