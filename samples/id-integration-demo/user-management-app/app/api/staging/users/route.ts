import { apiFetch } from '@/lib/api-client'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  const limit = searchParams.get('limit')
  const paginationToken = searchParams.get('paginationToken')
  if (limit) params.set('limit', limit)
  if (paginationToken) params.set('paginationToken', paginationToken)

  try {
    const res = await apiFetch(`/staging/users?${params}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
