import { NextResponse } from 'next/server';

export function bffError(message: string, status = 502): NextResponse {
  return NextResponse.json({ message }, { status });
}

// 101, 103, 204, 205, 304 are "null body status" codes per WHATWG Fetch spec.
// Constructing a Response with these statuses and a body throws a TypeError in
// conformant runtimes (e.g. Amplify / Node 18+ edge).
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

export async function forwardResponse(upstream: Response): Promise<NextResponse> {
  if (NULL_BODY_STATUSES.has(upstream.status)) {
    return new NextResponse(null, { status: upstream.status });
  }
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': contentType },
  });
}
