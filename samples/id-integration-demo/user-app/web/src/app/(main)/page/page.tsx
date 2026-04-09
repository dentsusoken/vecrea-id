import Link from "next/link";

/**
 * Post–sign-in landing page for the demo. Link returns visitors to the public root `/`.
 */
export default async function Page() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-center text-3xl font-semibold tracking-tight">
        After sign-in
      </h1>
      <p className="max-w-md text-center text-zinc-600">
        Authenticated area — placeholder post sign-in view (demo, no real auth).
      </p>
      <Link
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-800 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        href="/"
        prefetch={true}
      >
        Back to Home
      </Link>
    </div>
  );
}
