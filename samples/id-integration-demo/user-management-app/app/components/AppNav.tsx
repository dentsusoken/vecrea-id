'use client';

import Link from 'next/link';
import { AuthUserBar } from '@/components/AuthUserBar';
import { useAuthUser } from '@/lib/use-auth-user';

export function AppNav() {
  const { label, ready, signedIn, signOut } = useAuthUser();

  return (
    <header className="bg-um-titlebar text-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center w-full">
        {signedIn ? (
          <Link
            href="/users"
            className="font-semibold text-white no-underline hover:underline text-lg tracking-tight"
          >
            User management
          </Link>
        ) : (
          <span className="font-semibold text-lg tracking-tight text-white">
            User management
          </span>
        )}

        {ready && signedIn ? (
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link
              href="/users"
              className="text-white/90 no-underline hover:text-white hover:underline"
            >
              Users
            </Link>
            <Link
              href="/users/import"
              className="text-white/90 no-underline hover:text-white hover:underline"
            >
              Import CSV
            </Link>
            <Link
              href="/staging"
              className="text-white/90 no-underline hover:text-white hover:underline"
            >
              Staging
            </Link>
          </nav>
        ) : null}

        {ready && label ? (
          <AuthUserBar label={label} onSignOut={signOut} />
        ) : null}
      </div>
    </header>
  );
}
