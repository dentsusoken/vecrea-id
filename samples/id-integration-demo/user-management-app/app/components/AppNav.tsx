'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthUserBar } from '@/components/AuthUserBar';
import { useAuthUser } from '@/lib/use-auth-user';

const linkBase = 'text-white/90 no-underline hover:text-white hover:underline';
const linkActive = 'text-white font-semibold underline';

function isUsersSection(path: string) {
  if (path === '/users' || path === '/users/') return true;
  if (path.startsWith('/users/')) return true;
  return false;
}

export function AppNav() {
  const { label, ready, signedIn, signOut } = useAuthUser();
  const pathname = usePathname() ?? '';
  const usersActive = isUsersSection(pathname);
  const importActive = pathname === '/import';
  const adminActive =
    pathname.startsWith('/import/staging') || pathname.startsWith('/admin/');

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
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
            aria-label="Main"
          >
            <Link
              href="/users"
              className={usersActive ? `${linkBase} ${linkActive}` : linkBase}
            >
              Users
            </Link>
            <Link
              href="/import"
              className={importActive ? `${linkBase} ${linkActive}` : linkBase}
            >
              Import
            </Link>
            <details className="relative [&_summary::-webkit-details-marker]:hidden">
              <summary
                className={
                  adminActive
                    ? `${linkBase} ${linkActive} list-none cursor-pointer pr-0`
                    : `${linkBase} list-none cursor-pointer pr-0`
                }
              >
                <span className="inline-flex items-center gap-0.5">
                  Admin
                  <span className="text-white/80" aria-hidden>
                    ▾
                  </span>
                </span>
              </summary>
              <ul
                className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded border border-white/20 bg-um-titlebar py-1 shadow-md"
                role="menu"
              >
                <li role="none">
                  <Link
                    href="/import/staging"
                    className={
                      pathname === '/import/staging' ||
                      pathname.startsWith('/import/staging/')
                        ? 'block px-3 py-2 text-white font-semibold bg-white/15 no-underline'
                        : 'block px-3 py-2 text-white/95 no-underline hover:bg-white/10'
                    }
                    role="menuitem"
                  >
                    Staging
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/admin/data-init"
                    className={
                      pathname === '/admin/data-init' ||
                      pathname.startsWith('/admin/data-init/')
                        ? 'block px-3 py-2 text-white font-semibold bg-white/15 no-underline'
                        : 'block px-3 py-2 text-white/95 no-underline hover:bg-white/10'
                    }
                    role="menuitem"
                  >
                    Data reset
                  </Link>
                </li>
              </ul>
            </details>
          </nav>
        ) : null}

        {ready && label ? (
          <AuthUserBar label={label} onSignOut={signOut} />
        ) : null}
      </div>
    </header>
  );
}
