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
    <div className="px-5 py-6 max-w-xl space-y-6">
      <h1 className="text-um-heading text-xl font-semibold">Import users (CSV)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium mb-1 text-black">
            CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-black"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center min-w-[150px] px-0 py-3 text-sm font-medium text-white bg-um-primary border-0 cursor-pointer hover:bg-um-primary-hover active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Uploading…' : 'Upload'}
          </button>
          <Link
            href="/users"
            className="inline-flex items-center justify-center min-w-[150px] px-0 py-3 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Back to list
          </Link>
        </div>
      </form>

      {result ? (
        <div className="border border-um-border p-4 text-sm space-y-2 text-um-text">
          <p>
            <span className="font-semibold text-black">Total rows:</span> {result.totalRows}
          </p>
          <p>
            <span className="font-semibold text-black">Success:</span> {result.successCount}
          </p>
          <p>
            <span className="font-semibold text-black">Failures:</span> {result.failureCount}
          </p>
          {result.errors?.length ? (
            <div>
              <p className="font-semibold text-um-heading mt-3 mb-1">Errors</p>
              <ul className="list-disc pl-5 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <pre className="mt-4 p-4 text-xs overflow-x-auto bg-[#f4f4f4] border border-[#ddd] border-l-4 border-l-um-pre-accent text-um-text max-w-full">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
