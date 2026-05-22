'use client'

import { useState } from 'react'

const CONFIRM_WORD = 'RESET'

export default function SettingsPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ usersDeleted: number; stagingDeleted: number } | null>(null)
  const [error, setError] = useState('')

  async function handleReset() {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/reset', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `${res.status}`)
      setResult(data)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リセットに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const canReset = input === CONFIRM_WORD && !loading

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">設定</h1>

      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h2 className="text-sm font-semibold text-red-800">危険な操作</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">データリセット</h3>
            <p className="text-sm text-gray-500">
              全ユーザーとステージングデータを削除します。この操作は取り消せません。
            </p>
          </div>

          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              リセット完了 — ユーザー {result.usersDeleted} 件、ステージング {result.stagingDeleted} 件を削除しました
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              確認のため <code className="bg-gray-100 px-1 rounded font-mono text-xs">{CONFIRM_WORD}</code> と入力してください
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={CONFIRM_WORD}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleReset}
            disabled={!canReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? '削除中...' : '全データをリセット'}
          </button>
        </div>
      </div>
    </div>
  )
}
