"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      onClick={async () =>
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              // Better Auth doesn't force a redirect on sign-out; keep navigation in-app.
              router.push("/");
            },
          },
        })
      }
      type="button"
    >
      Sign out
    </button>
  );
}
