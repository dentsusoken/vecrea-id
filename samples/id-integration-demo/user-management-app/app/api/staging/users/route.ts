import { managementApiFetch } from '@/lib/management-api';
import { bffError, forwardResponse } from '@/lib/bff-response';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const path = qs ? `/staging/users?${qs}` : '/staging/users';
    const upstream = await managementApiFetch(path);
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}
