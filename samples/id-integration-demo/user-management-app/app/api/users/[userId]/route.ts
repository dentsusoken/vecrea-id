import { managementApiFetch } from '@/lib/management-api';
import { bffError, forwardResponse } from '@/lib/bff-response';

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const enc = encodeURIComponent(userId);
    const upstream = await managementApiFetch(`/users/${enc}`);
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const enc = encodeURIComponent(userId);
    const body = await request.text();
    const upstream = await managementApiFetch(`/users/${enc}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const enc = encodeURIComponent(userId);
    const upstream = await managementApiFetch(`/users/${enc}`, {
      method: 'DELETE',
    });
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}
