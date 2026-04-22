import type { NextRequest } from 'next/server';

/**
 * Browser-facing origin behind Amplify / proxies. Prefer forwarding headers because
 * `request.url` / `nextUrl` may use an internal host (e.g. localhost:3000), which would
 * break `new URL(path, request.url)` redirects.
 */
export function publicOriginFromRequest(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host') ||
    request.nextUrl.host;
  const rawProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (request.nextUrl.protocol === 'http:' ? 'http' : 'https');
  const proto = rawProto === 'http' || rawProto === 'https' ? rawProto : 'https';
  return `${proto}://${host}`;
}
