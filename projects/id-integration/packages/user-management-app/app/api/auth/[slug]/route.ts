import { createAuthRouteHandlers } from '@/lib/amplify-server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type AuthSlugHandler = (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => Promise<Response | undefined>;

let handleAuth: AuthSlugHandler | null = null;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  if (!handleAuth) {
    handleAuth = createAuthRouteHandlers({
      redirectOnSignInComplete: '/auth/continue',
      redirectOnSignOutComplete: '/users',
    });
  }
  const run = handleAuth as AuthSlugHandler;
  const response = await run(request, { params: context.params });
  if (!response) {
    throw new Error('Auth route handler did not return a response');
  }
  return response;
}
