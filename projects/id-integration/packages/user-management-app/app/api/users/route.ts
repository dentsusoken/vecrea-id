import { managementApiFetch } from '@/lib/management-api';
import { bffError, forwardResponse } from '@/lib/bff-response';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const path = qs ? `/users?${qs}` : '/users';
    const upstream = await managementApiFetch(path);
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const upstream = await managementApiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}
