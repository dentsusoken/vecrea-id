interface TokenEntry {
  token: string
  expiresAt: number
}

let cache: TokenEntry | null = null

export async function getAccessToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.token
  }

  const endpoint = process.env.OAUTH_TOKEN_ENDPOINT
  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  const scope = process.env.OAUTH_SCOPE

  if (!endpoint || !clientId || !clientSecret) {
    throw new Error('OAuth credentials are not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })
  if (scope) body.set('scope', scope)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status}`)
  }

  const data = await res.json()
  cache = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  }

  return cache.token
}
