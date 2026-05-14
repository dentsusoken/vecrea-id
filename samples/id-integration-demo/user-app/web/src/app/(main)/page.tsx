import Link from "next/link";

/**
 * Public demo home. Includes a link to `/page`, which is intended to be
 * session-gated (see `src/proxy.ts` when wired as middleware).
 */
export default function DemoHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-center text-3xl font-semibold tracking-tight">
        Demo Home
      </h1>
      <p className="max-w-md text-center text-zinc-600">
        This is the demo app’s root page. You can view it before or after signing in, and the header actions update based on your session.
      </p>
      <Link
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-800 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        href="/page"
        prefetch={true}
      >
        Go to Page
      </Link>
    </div>
  );
}
