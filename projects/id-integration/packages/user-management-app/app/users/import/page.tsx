'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { ImportUsersCsvResponse } from '@/types/user';

export default function ImportCsvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportUsersCsvResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError('Choose a CSV file');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/users/import-csv', {
        method: 'POST',
        body: fd,
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text) as { message?: string };
          setError(j.message ?? text);
        } catch {
          setError(text || res.statusText);
        }
        return;
      }
      setResult(JSON.parse(text) as ImportUsersCsvResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Import users (CSV)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium mb-1">
            CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Uploading…' : 'Upload'}
          </button>
          <Link
            href="/users"
            className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm"
          >
            Back to list
          </Link>
        </div>
      </form>

      {result ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-sm space-y-2">
          <p>
            <span className="font-medium">Total rows:</span> {result.totalRows}
          </p>
          <p>
            <span className="font-medium">Success:</span> {result.successCount}
          </p>
          <p>
            <span className="font-medium">Failures:</span> {result.failureCount}
          </p>
          {result.errors?.length ? (
            <div>
              <p className="font-medium mt-3 mb-1">Errors</p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
                {result.errors.map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <pre className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
