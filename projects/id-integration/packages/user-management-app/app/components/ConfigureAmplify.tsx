'use client';

import { getAmplifyResourcesConfig } from '@/lib/amplify-config';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from 'aws-amplify/utils';

let clientConfigured = false;

function ensureAmplifyConfiguredOnClient() {
  if (typeof window === 'undefined' || clientConfigured) return;
  clientConfigured = true;
  cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
  Amplify.configure(getAmplifyResourcesConfig(), { ssr: true });
}

export function ConfigureAmplify({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    ensureAmplifyConfiguredOnClient();
  }
  return <>{children}</>;
}
