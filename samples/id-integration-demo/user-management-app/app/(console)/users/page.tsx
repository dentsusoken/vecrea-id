'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface User {
  userId: string
  username: string
  email?: string
  status: string
  enabled: boolean
  attributes?: Record<string, string>
}

interface UsersResponse {
  items: User[]
  paginationToken?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
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
      const res = await fetch(`/api/users?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const body = await res.json()
      setUsers(body.items ?? [])
      setPaginationToken(body.paginationToken)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === users.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(users.map((u) => u.username)))
    }
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selected.size} selected user(s)?`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/users/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: Array.from(selected) }),
      })
      if (!res.ok) throw new Error()
      setSelected(new Set())
      await fetchUsers()
    } catch {
      alert('Failed to delete users')
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
    const prev = tokens.pop()
    setPrevTokens(tokens)
    fetchUsers(tokens[tokens.length - 1])
    setSelected(new Set())
  }

  const statusLabel: Record<string, string> = {
    CONFIRMED: 'Confirmed',
    UNCONFIRMED: 'Unconfirmed',
    FORCE_CHANGE_PASSWORD: 'Force change password',
    RESET_REQUIRED: 'Reset required',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg"
            >
              {deleting ? 'Deleting...' : `Delete ${selected.size}`}
            </button>
          )}
          <Link
            href="/users/import"
            className="px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
          >
            Import CSV
          </Link>
          <Link
            href="/users/new"
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            + New user
          </Link>
        </div>
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
              <th className="px-4 py-3 text-left font-medium text-gray-600">Username</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Enabled</th>
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(user.username)}
                      onChange={() => toggleSelect(user.username)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{user.username}</td>
                  <td className="px-4 py-3 text-gray-700">{user.email ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {[user.attributes?.family_name, user.attributes?.given_name]
                      .filter(Boolean)
                      .join(' ') || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {statusLabel[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.enabled
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {user.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/users/${user.userId}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Edit
                    </Link>
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
