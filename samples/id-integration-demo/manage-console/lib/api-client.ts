import { getAccessToken } from './token-cache'

const BASE_URL = process.env.API_BASE_URL!

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken()
  const url = `${BASE_URL}${path}`

  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}
