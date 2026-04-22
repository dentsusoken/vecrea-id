import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

export function AppNav() {
  return (
    <header className="bg-um-titlebar text-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
        <Link
          href="/users"
          className="font-semibold text-white no-underline hover:underline text-lg tracking-tight"
        >
          User management
        </Link>
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
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
