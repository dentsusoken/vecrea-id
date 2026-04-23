import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { getAmplifyAuthConfig } from '@/lib/amplify-config';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: getAmplifyAuthConfig(),
});
