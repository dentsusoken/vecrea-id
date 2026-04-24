'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
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

  const [adminOpen, setAdminOpen] = useState(false);
  const adminWrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!adminOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = adminWrapRef.current;
      const t = e.target;
      if (t == null || !(t instanceof Node)) {
        setAdminOpen(false);
        return;
      }
      if (el && !el.contains(t)) {
        setAdminOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdminOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [adminOpen]);

  useEffect(() => {
    setAdminOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-50 bg-um-titlebar text-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center w-full min-w-0">
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
            className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm"
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
            <div className="relative" ref={adminWrapRef}>
              <button
                type="button"
                className={
                  adminActive
                    ? `${linkBase} ${linkActive} text-left`
                    : `${linkBase} text-left`
                }
                aria-haspopup="menu"
                aria-expanded={adminOpen}
                aria-controls={adminOpen ? menuId : undefined}
                id={`${menuId}-button`}
                onClick={() => setAdminOpen((o) => !o)}
              >
                <span className="inline-flex items-center gap-0.5">
                  Admin
                  <span className="text-white/80" aria-hidden>
                    ▾
                  </span>
                </span>
              </button>
              {adminOpen ? (
                <ul
                  id={menuId}
                  role="menu"
                  aria-labelledby={`${menuId}-button`}
                  className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded border border-white/20 bg-um-titlebar py-1 shadow-md"
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
                      onClick={() => setAdminOpen(false)}
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
                      onClick={() => setAdminOpen(false)}
                    >
                      Data reset
                    </Link>
                  </li>
                </ul>
              ) : null}
            </div>
          </nav>
        ) : null}

        {ready && label ? (
          <AuthUserBar label={label} onSignOut={signOut} />
        ) : null}
      </div>
    </header>
  );
}
