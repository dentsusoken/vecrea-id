import { apiFetch } from '@/lib/api-client'
import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'ファイルが指定されていません' }, { status: 400 })
    }

    const csvText = await file.text()

    const res = await apiFetch('/users/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: csvText,
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
