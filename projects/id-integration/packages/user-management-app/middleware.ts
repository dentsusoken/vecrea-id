import { publicOriginFromRequest } from '@/lib/public-origin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function shouldBypassAuth(): boolean {
  return process.env.NODE_ENV === 'development';
}

export async function middleware(request: NextRequest) {
  if (shouldBypassAuth()) {
    return NextResponse.next();
  }

  const [{ fetchAuthSession }, { runWithAmplifyServerContext }] = await Promise.all([
    import('aws-amplify/auth/server'),
    import('@/lib/amplify-server'),
  ]);

  const response = NextResponse.next();
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (authenticated) {
    return response;
  }

  const origin = publicOriginFromRequest(request);
  return NextResponse.redirect(new URL('/login', origin));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
