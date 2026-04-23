import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/lib/amplify-server';

export async function middleware(request: NextRequest) {
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

  const loginUrl = new URL('/login', request.url);
  if (request.nextUrl.pathname !== '/login') {
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
