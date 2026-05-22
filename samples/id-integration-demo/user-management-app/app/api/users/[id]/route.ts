import { apiFetch } from '@/lib/api-client'
import { type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const res = await apiFetch(`/users/${id}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const res = await apiFetch(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const res = await apiFetch(`/users/${id}`, { method: 'DELETE' })
    if (res.status === 204) {
      return new Response(null, { status: 204 })
    }
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
