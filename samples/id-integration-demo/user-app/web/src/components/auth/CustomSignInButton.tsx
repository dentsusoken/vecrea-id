"use client";

import { signIn } from "@/lib/auth-client";

const buttonClassName =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:-translate-y-px hover:bg-zinc-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2";

/**
 * Starts Generic OAuth sign-in (`providerId: "custom"`). After IdP success,
 * redirects to `/page` to exercise session-gated routes in this demo.
 */
export function CustomSignInButton() {
  return (
    <button
      className={buttonClassName}
      onClick={async () =>
        await signIn.oauth2({
          providerId: "custom",
          callbackURL: "/page",
        })
      }
      type="button"
    >
      Sign in
    </button>
  );
}
