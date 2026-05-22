'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  userId: string
  username: string
  email?: string
  emailVerified?: boolean
  enabled: boolean
  status: string
  attributes?: Record<string, string>
  phoneNumber?: string
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    emailVerified: false,
    phoneNumber: '',
    given_name: '',
    family_name: '',
    enabled: true,
  })

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data: User) => {
        setUser(data)
        setForm({
          email: data.email ?? '',
          emailVerified: data.emailVerified ?? false,
          phoneNumber: data.phoneNumber ?? data.attributes?.phone_number ?? '',
          given_name: data.attributes?.given_name ?? '',
          family_name: data.attributes?.family_name ?? '',
          enabled: data.enabled,
        })
      })
      .catch(() => setError('ユーザーの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const attributes: Record<string, string> = {}
      if (form.given_name) attributes.given_name = form.given_name
      if (form.family_name) attributes.family_name = form.family_name

      const body: Record<string, unknown> = {
        enabled: form.enabled,
        attributes,
      }
      if (form.email) { body.email = form.email; body.emailVerified = form.emailVerified }
      if (form.phoneNumber) body.phoneNumber = form.phoneNumber

      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || `エラー: ${res.status}`)
      router.push('/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('このユーザーを削除しますか？この操作は取り消せません。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error()
      router.push('/users')
    } catch {
      setError('削除に失敗しました')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">読み込み中...</div>
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || 'ユーザーが見つかりません'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-700">
          ユーザー管理
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-900 font-mono">{user.username}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">ユーザー編集</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50"
        >
          {deleting ? '削除中...' : 'ユーザーを削除'}
        </button>
      </div>

      <div className="mb-4 bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div><span className="text-gray-500">User ID: </span><span className="font-mono text-xs">{user.userId}</span></div>
        <div><span className="text-gray-500">ステータス: </span>{user.status}</div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="姓" htmlFor="family_name">
            <input
              id="family_name"
              type="text"
              value={form.family_name}
              onChange={(e) => set('family_name', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="名" htmlFor="given_name">
            <input
              id="given_name"
              type="text"
              value={form.given_name}
              onChange={(e) => set('given_name', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="メールアドレス" htmlFor="email">
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputCls}
          />
          <label className="flex items-center gap-2 mt-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.emailVerified}
              onChange={(e) => set('emailVerified', e.target.checked)}
              className="rounded border-gray-300"
            />
            メール確認済みにする
          </label>
        </Field>

        <Field label="電話番号" htmlFor="phoneNumber">
          <input
            id="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={(e) => set('phoneNumber', e.target.value)}
            className={inputCls}
            placeholder="+819012345678"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="rounded border-gray-300"
          />
          アカウントを有効にする
        </label>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <Link
            href="/users"
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
