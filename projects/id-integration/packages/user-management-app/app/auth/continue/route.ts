import {
  AUTH_POST_LOGIN_COOKIE,
  safePostLoginPath,
} from '@/lib/auth-post-login';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const raw = request.cookies.get(AUTH_POST_LOGIN_COOKIE)?.value;
  const dest = safePostLoginPath(raw);
  const res = NextResponse.redirect(new URL(dest, request.url));
  res.cookies.delete(AUTH_POST_LOGIN_COOKIE);
  return res;
}
