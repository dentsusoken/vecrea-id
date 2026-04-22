import { AUTH_POST_LOGIN_COOKIE } from '@/lib/auth-post-login';
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
  const signIn = new URL('/api/auth/sign-in', origin);
  const redirectRes = NextResponse.redirect(signIn);
  const path = request.nextUrl.pathname + request.nextUrl.search;
  redirectRes.cookies.set(AUTH_POST_LOGIN_COOKIE, path, {
    path: '/',
    maxAge: 900,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: true,
  });
  return redirectRes;
}

export const config = {
  matcher: [
    /*
     * Skip static assets, Next internals, all API routes (including /api/auth/*), and favicon.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
