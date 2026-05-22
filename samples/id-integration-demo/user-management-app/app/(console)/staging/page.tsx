'use client'

import { useCallback, useEffect, useState } from 'react'

interface StagingUser {
  id: string
  imported: boolean
  verified: boolean
  error?: string
  errorMessage?: string
  data?: object
}

interface StagingResponse {
  items: StagingUser[]
  paginationToken?: string
}

export default function StagingPage() {
  const [users, setUsers] = useState<StagingUser[]>([])
  const [paginationToken, setPaginationToken] = useState<string | undefined>()
  const [prevTokens, setPrevTokens] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async (token?: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (token) params.set('paginationToken', token)
      const res = await fetch(`/api/staging/users?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data: StagingResponse = await res.json()
      setUsers(data.items ?? [])
      setPaginationToken(data.paginationToken)
    } catch {
      setError('Failed to load staging data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === users.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(users.map((u) => u.id)))
    }
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selected.size} selected staging entry(s)?`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/staging/users/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error()
      setSelected(new Set())
      await fetchUsers()
    } catch {
      alert('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  function nextPage() {
    if (!paginationToken) return
    setPrevTokens((p) => [...p, paginationToken])
    fetchUsers(paginationToken)
    setSelected(new Set())
  }

  function prevPage() {
    const tokens = [...prevTokens]
    tokens.pop()
    setPrevTokens(tokens)
    fetchUsers(tokens[tokens.length - 1])
    setSelected(new Set())
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staging</h1>
          <p className="text-sm text-gray-500 mt-1">Temporary data after CSV import</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg"
          >
            {deleting ? 'Deleting...' : `Delete ${selected.size}`}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ID (username)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-gray-400">
                  No staging data
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{user.id}</td>
                  <td className="px-4 py-3 text-xs">
                    {user.error !== undefined ? (
                      <span className="text-red-600">Error</span>
                    ) : user.imported ? (
                      <span className="text-green-600">Imported</span>
                    ) : (
                      <span className="text-gray-500">Awaiting first login</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={prevPage}
          disabled={prevTokens.length === 0}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          onClick={nextPage}
          disabled={!paginationToken}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
