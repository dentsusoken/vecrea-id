'use client';

import { ToastProvider } from '@/lib/toast-context';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
