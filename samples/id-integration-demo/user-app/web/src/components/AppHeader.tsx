import Link from 'next/link'

export function AppHeader() {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <Link
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        href="/login"
        prefetch={true}
      >
        Log in
      </Link>
      <Link
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        href="/"
        prefetch={true}
      >
        Log out
      </Link>
    </header>
  )
}
