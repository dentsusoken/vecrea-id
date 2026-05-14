'use client';

import { Amplify } from 'aws-amplify';
import { getAmplifyAuthConfig } from '@/lib/amplify-config';

Amplify.configure(getAmplifyAuthConfig(), { ssr: true });

export function ConfigureAmplify() {
  return null;
}
