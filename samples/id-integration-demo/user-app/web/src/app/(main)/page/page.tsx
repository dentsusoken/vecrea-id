import Link from "next/link";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

function formatMaybeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Post–sign-in landing page for the demo. Unauthenticated users may be blocked
 * before reaching here depending on middleware, but we still gate UI rendering.
 */
export default async function AfterSignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          After sign-in
        </h1>
        <p className="max-w-md text-center text-zinc-600">
          You are not signed in. Please sign in to view your profile details.
        </p>
        <Link
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-800 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          href="/sign-in"
          prefetch={true}
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  const user = session.user as Record<string, unknown>;
  const email =
    formatMaybeString(user.email) ||
    formatMaybeString(user.emailAddress) ||
    formatMaybeString(user.mail);
  const name =
    formatMaybeString(user.name) ||
    formatMaybeString(user.displayName) ||
    formatMaybeString(user.preferred_username) ||
    formatMaybeString(user.preferredUsername);
  const picture =
    formatMaybeString(user.image) ||
    formatMaybeString(user.picture) ||
    formatMaybeString(user.avatar_url) ||
    formatMaybeString(user.avatarUrl);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">After sign-in</h1>
        <p className="max-w-md text-zinc-600">
          Authenticated area — showing user data returned by the IdP (via
          session).
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picture}
              alt="Profile picture"
              className="h-12 w-12 rounded-full bg-zinc-100 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-12 w-12 rounded-full border border-zinc-200 bg-zinc-100" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {name ?? "Unknown user"}
            </div>
            <div className="truncate text-xs text-zinc-600">
              {email ?? "(no email)"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
            Raw profile
          </div>
          <pre className="max-h-[40vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
            {toPrettyJson(user)}
          </pre>
        </div>
      </div>

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
