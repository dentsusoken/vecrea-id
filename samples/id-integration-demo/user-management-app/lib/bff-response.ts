import { NextResponse } from 'next/server';

export function bffError(message: string, status = 502): NextResponse {
  return NextResponse.json({ message }, { status });
}

export async function forwardResponse(upstream: Response): Promise<NextResponse> {
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': contentType },
  });
}
