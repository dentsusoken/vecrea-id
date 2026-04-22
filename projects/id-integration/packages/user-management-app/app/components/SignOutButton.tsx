'use client';

import { signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const showSignOut = process.env.NODE_ENV === 'production';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!showSignOut) return null;

  return (
    <button
      type="button"
      disabled={busy}
      className="text-white/90 bg-transparent border-0 cursor-pointer text-sm p-0 font-sans hover:text-white hover:underline disabled:opacity-60"
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ global: true });
        } finally {
          router.push('/login');
          router.refresh();
          setBusy(false);
        }
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
