'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '',
    email: '',
    given_name: '',
    family_name: '',
    phone_number: '',
    temporaryPassword: '',
    suppressInvitation: false,
  })

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const attributes: Record<string, string> = {}
      if (form.given_name) attributes.given_name = form.given_name
      if (form.family_name) attributes.family_name = form.family_name
      if (form.phone_number) attributes.phone_number = form.phone_number

      const body: Record<string, unknown> = {
        username: form.username,
        email: form.email || undefined,
        attributes,
        suppressInvitation: form.suppressInvitation,
      }
      if (form.temporaryPassword) body.temporaryPassword = form.temporaryPassword

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || `エラー: ${res.status}`)
      }
      router.push('/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザーの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-700">
          ユーザー管理
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-900">新規作成</span>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">ユーザーを追加</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="姓" htmlFor="family_name">
            <input
              id="family_name"
              type="text"
              value={form.family_name}
              onChange={(e) => set('family_name', e.target.value)}
              className={inputCls}
              placeholder="田中"
            />
          </Field>
          <Field label="名" htmlFor="given_name">
            <input
              id="given_name"
              type="text"
              value={form.given_name}
              onChange={(e) => set('given_name', e.target.value)}
              className={inputCls}
              placeholder="太郎"
            />
          </Field>
        </div>

        <Field label="ユーザー名" htmlFor="username" required>
          <input
            id="username"
            type="text"
            required
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            className={inputCls}
            placeholder="tanaka-taro"
          />
        </Field>

        <Field label="メールアドレス" htmlFor="email">
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputCls}
            placeholder="taro@example.com"
          />
        </Field>

        <Field label="電話番号" htmlFor="phone_number">
          <input
            id="phone_number"
            type="tel"
            value={form.phone_number}
            onChange={(e) => set('phone_number', e.target.value)}
            className={inputCls}
            placeholder="+819012345678"
          />
        </Field>

        <Field label="初期パスワード" htmlFor="temporaryPassword">
          <input
            id="temporaryPassword"
            type="password"
            value={form.temporaryPassword}
            onChange={(e) => set('temporaryPassword', e.target.value)}
            className={inputCls}
            placeholder="省略時はCognitoが自動生成"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.suppressInvitation}
            onChange={(e) => set('suppressInvitation', e.target.checked)}
            className="rounded border-gray-300"
          />
          招待メールを送信しない
        </label>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
          >
            {loading ? '作成中...' : '作成'}
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
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
