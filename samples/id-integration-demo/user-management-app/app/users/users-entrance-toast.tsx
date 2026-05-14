'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/toast-context';

/**
 * Consumes one-time `?toast=` on `/users` (e.g. after data init redirect).
 */
export function UsersEntranceToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { show } = useToast();
  const processedKey = useRef<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('toast');
    if (!t) {
      processedKey.current = null;
      return;
    }
    const u = searchParams.get('u') ?? '';
    const key = `${t}:${u}`;
    if (processedKey.current === key) return;
    processedKey.current = key;
    if (t === 'dataInit') {
      show('Demo data has been reset (staging + Cognito).', 'success');
      router.replace('/users', { scroll: false });
      return;
    }
    if (t === 'userDeleted') {
      show(
        u ? `User "${u}" was deleted.` : 'User was deleted.',
        'success'
      );
      router.replace('/users', { scroll: false });
    }
  }, [searchParams, router, show]);

  return null;
}
