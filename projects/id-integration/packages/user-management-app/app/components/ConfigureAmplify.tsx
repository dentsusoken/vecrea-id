'use client';

import { ensureAmplifyConfiguredOnClient } from '@/lib/amplify-client';
import { useLayoutEffect } from 'react';

export function ConfigureAmplify({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    ensureAmplifyConfiguredOnClient();
  }, []);
  return <>{children}</>;
}
