import Link from 'next/link';

export function AppNav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-wrap gap-4 items-center">
      <Link href="/users" className="font-semibold text-zinc-900 dark:text-zinc-100">
        User management
      </Link>
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/users" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          Users
        </Link>
        <Link href="/users/new" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          New user
        </Link>
        <Link href="/users/import" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          Import CSV
        </Link>
        <Link href="/staging" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          Staging
        </Link>
      </nav>
    </header>
  );
}
