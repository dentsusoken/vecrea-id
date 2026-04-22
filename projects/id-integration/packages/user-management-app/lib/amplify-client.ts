'use client';

import { getAmplifyResourcesConfig } from '@/lib/amplify-config';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from 'aws-amplify/utils';

let amplifyConfiguredOnClient = false;

/**
 * ブラウザで一度だけ Amplify を初期化する。configure 成功後にのみフラグを立てる。
 */
export function ensureAmplifyConfiguredOnClient(): void {
  if (typeof window === 'undefined' || amplifyConfiguredOnClient) {
    return;
  }
  cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
  Amplify.configure(getAmplifyResourcesConfig(), { ssr: true });
  amplifyConfiguredOnClient = true;
}
