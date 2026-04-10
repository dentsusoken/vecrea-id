import { managementApiFetch } from '@/lib/management-api';
import { bffError, forwardResponse } from '@/lib/bff-response';

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get('file');
    if (file == null || typeof file === 'string') {
      return bffError('multipart field "file" with a file body is required', 422);
    }
    if (!(file instanceof Blob)) {
      return bffError('multipart field "file" must be a file', 422);
    }
    const out = new FormData();
    out.append('file', file);
    const upstream = await managementApiFetch('/users/import-csv', {
      method: 'POST',
      body: out,
    });
    return forwardResponse(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bffError(msg, 502);
  }
}
