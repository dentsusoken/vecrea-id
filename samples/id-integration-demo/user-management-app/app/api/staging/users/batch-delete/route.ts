import { managementApiFetch } from '@/lib/management-api';
import { bffError, forwardResponse } from '@/lib/bff-response';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const upstream = await managementApiFetch('/staging/users/batch-delete', {
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
