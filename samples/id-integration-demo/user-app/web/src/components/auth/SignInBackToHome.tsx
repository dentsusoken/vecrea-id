"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  inferAppHomeFromOAuthReturn,
  readPersistedExpoAppHomeUrl,
  readPersistedExpoOauthReturnUrl,
} from "@/lib/expo-inapp-oauth-bridge";

const linkClassName =
  "text-sm font-medium text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 rounded-sm";

/**
 * Web: return to the demo home (`/`).
 * Expo in-app browser: use a trusted deep link back to the app root.
 * If we come back as `/sign-in?error=...` (missing query params), restore the
 * deep link from `sessionStorage`.
 */
export function SignInBackToHome({
  oauthReturnUrl,
  appHomeUrl,
}: {
  oauthReturnUrl?: string;
  appHomeUrl?: string;
}) {
  const serverDismiss =
    appHomeUrl ??
    (oauthReturnUrl ? inferAppHomeFromOAuthReturn(oauthReturnUrl) : undefined);
  const [dismissHref, setDismissHref] = useState<string | undefined>(serverDismiss);

  useEffect(() => {
    const fromServer =
      appHomeUrl ??
      (oauthReturnUrl ? inferAppHomeFromOAuthReturn(oauthReturnUrl) : undefined);
    if (fromServer) {
      setDismissHref(fromServer);
      return;
    }
    const storedHome = readPersistedExpoAppHomeUrl();
    const storedReturn = readPersistedExpoOauthReturnUrl();
    const fromStored =
      storedHome ??
      (storedReturn ? inferAppHomeFromOAuthReturn(storedReturn) : undefined);
    setDismissHref(fromStored ?? undefined);
  }, [oauthReturnUrl, appHomeUrl]);

  if (dismissHref) {
    return (
      <a className={linkClassName} href={dismissHref}>
        Back to app home
      </a>
    );
  }

  return (
    <Link className={linkClassName} href="/" prefetch={true}>
      Back to Demo Home
    </Link>
  );
}
