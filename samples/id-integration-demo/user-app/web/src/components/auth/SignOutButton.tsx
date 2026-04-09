"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

/**
 * Signs the user out via Better Auth. On success, navigates to `/` in-app;
 * Better Auth does not perform an automatic post-sign-out redirect by default.
 */
export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      onClick={async () =>
        await signOut({
          fetchOptions: {
            onSuccess: () => {
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
