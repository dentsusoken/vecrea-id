'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

interface ImportResult {
  totalRows: number
  successCount: number
  failureCount: number
  errors?: Array<{ row: number; message: string }>
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/users/import-csv', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || `Error: ${res.status}`)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-700">
          Users
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-900">Import CSV</span>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-2">Import CSV</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV file to bulk-import users into the staging table.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">CSV format</h2>
        <p className="text-xs text-gray-500 mb-2">
          Required column: <code className="bg-gray-100 px-1 rounded">cognito:username</code>
        </p>
        <p className="text-xs text-gray-500">
          Available columns: cognito:username, email, phone_number, given_name, family_name, password_hash, etc.
        </p>
        <pre className="mt-3 text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600">
{`cognito:username,email,given_name,family_name
user001,user001@example.com,Alice,Smith
user002,user002@example.com,Bob,Jones`}
        </pre>
      </div>

      <form onSubmit={handleImport} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">.csv files only</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.failureCount === 0
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="text-sm font-medium text-gray-900 mb-2">Import result</p>
            <div className="text-sm space-y-1">
              <p>Total: {result.totalRows}</p>
              <p className="text-green-700">Success: {result.successCount}</p>
              {result.failureCount > 0 && (
                <p className="text-red-700">Failed: {result.failureCount}</p>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    Row {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!file || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
          <Link
            href="/users"
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
