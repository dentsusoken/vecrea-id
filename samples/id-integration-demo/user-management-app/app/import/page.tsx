'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import { ImportWizardStepper } from '@/app/components/ImportWizardStepper';
import type { ImportUsersCsvResponse } from '@/types/user';

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
      const json = JSON.parse(text) as ImportUsersCsvResponse;
      const batch = json.importBatchId
        ? `&importBatchId=${encodeURIComponent(json.importBatchId)}`
        : '';
      router.push(`/import/staging?fromImport=1${batch}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-6 max-w-xl space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Users', href: '/users' },
          { label: 'Import' },
        ]}
      />
      <div className="space-y-2">
        <h1 className="text-um-heading text-xl font-semibold">Import (CSV)</h1>
        <ImportWizardStepper current={1} />
      </div>
      <p className="text-sm text-um-text -mt-2">
        Upload writes rows to the DynamoDB staging table used by migration. After a
        successful upload you are taken to{' '}
        <Link
          href="/import/staging"
          className="text-um-link no-underline hover:underline"
        >
          Review
        </Link>{' '}
        to inspect rows (Scan may include older data unless filtered by import batch
        when available).
      </p>
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

    </div>
  );
}
