import { apiFetch } from '@/lib/api-client'

export async function POST() {
  try {
    const result = { usersDeleted: 0, stagingDeleted: 0 }

    // ユーザーを全件取得して一括削除（ページネーション対応）
    let userToken: string | undefined
    do {
      const params = new URLSearchParams({ limit: '60' })
      if (userToken) params.set('paginationToken', userToken)

      const res = await apiFetch(`/users?${params}`)
      if (!res.ok) throw new Error(`users list failed: ${res.status}`)
      const data = await res.json()
      const items: Array<{ username: string }> = data.items ?? []
      userToken = data.paginationToken

      if (items.length > 0) {
        const delRes = await apiFetch('/users/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ usernames: items.map((u) => u.username) }),
        })
        if (!delRes.ok) throw new Error(`users batch-delete failed: ${delRes.status}`)
        result.usersDeleted += items.length
      }
    } while (userToken)

    // ステージングを全件取得して一括削除
    let stagingToken: string | undefined
    do {
      const params = new URLSearchParams({ limit: '100' })
      if (stagingToken) params.set('paginationToken', stagingToken)

      const res = await apiFetch(`/staging/users?${params}`)
      if (!res.ok) break // ステージングが空でも続行
      const data = await res.json()
      const items: Array<{ id: string }> = data.items ?? []
      stagingToken = data.paginationToken

      if (items.length > 0) {
        await apiFetch('/staging/users/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ ids: items.map((u) => u.id) }),
        })
        result.stagingDeleted += items.length
      }
    } while (stagingToken)

    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
