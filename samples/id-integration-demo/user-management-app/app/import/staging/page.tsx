'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import { ImportWizardStepper } from '@/app/components/ImportWizardStepper';
import type { ListStagingUsersResponse } from '@/types/staging';

function stagingDataPreview(data: Record<string, unknown>): string {
  const email = data.email;
  const uname = data['cognito:username'];
  const parts: string[] = [];
  if (typeof uname === 'string') parts.push(`username: ${uname}`);
  if (typeof email === 'string') parts.push(`email: ${email}`);
  return parts.length > 0 ? parts.join(' · ') : JSON.stringify(data).slice(0, 120);
}

function buildStagingListUrl(
  next: { token?: string; importBatchId?: string; fromImport?: boolean }
): string {
  const qs = new URLSearchParams();
  if (next.fromImport) qs.set('fromImport', '1');
  if (next.importBatchId) qs.set('importBatchId', next.importBatchId);
  if (next.token) qs.set('paginationToken', next.token);
  const s = qs.toString();
  return s ? `/import/staging?${s}` : '/import/staging';
}

function StagingListInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('paginationToken');
  const importBatchId = searchParams.get('importBatchId') ?? undefined;
  const fromImport = searchParams.get('fromImport') === '1';
  const [data, setData] = useState<ListStagingUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (token) qs.set('paginationToken', token);
        if (importBatchId) qs.set('importBatchId', importBatchId);
        const res = await fetch(`/api/staging/users${qs.size ? `?${qs}` : ''}`);
        const text = await res.text();
        if (!res.ok) {
          try {
            const j = JSON.parse(text) as { message?: string };
            setError(j.message ?? (text || res.statusText));
          } catch {
            setError(text || res.statusText);
          }
          setData(null);
          return;
        }
        if (!cancelled) setData(JSON.parse(text) as ListStagingUsersResponse);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, importBatchId]);

  if (loading) {
    return <p className="px-5 py-6 text-um-text opacity-80">Loading…</p>;
  }
  if (error) {
    return <p className="px-5 py-6 text-red-600">{error}</p>;
  }
  if (!data) {
    return null;
  }

  const nextHref = data.paginationToken
    ? buildStagingListUrl({
        token: data.paginationToken,
        importBatchId,
        fromImport: fromImport || undefined,
      })
    : null;

  return (
    <div className="px-5 py-6 space-y-4">
      {fromImport ? (
        <p
          className="text-sm border border-amber-200 bg-amber-50 text-amber-950 px-3 py-2 max-w-3xl"
          role="status"
        >
          You uploaded a CSV. Review staging rows below.{' '}
          {importBatchId
            ? 'Showing the current import batch when available (rows tagged with the same `importBatchId`). Open “All rows” to see the full table.'
            : 'Older imports may also appear in this Scan; use a batch filter from a fresh upload if needed.'}
        </p>
      ) : null}

      <p className="text-sm text-um-text max-w-3xl">
        Staging: <strong className="text-black">{data.items.length}</strong> row(s) on
        this page. Rows are created from{' '}
        <Link href="/import" className="text-um-link no-underline hover:underline">
          Import
        </Link>
        . <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">imported</code> is
        set when migration completes; <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">verified</code> reflects CSV
        flags.
      </p>

      <div className="flex flex-wrap gap-2 text-sm">
        {importBatchId ? (
          <Link
            href={fromImport ? '/import/staging?fromImport=1' : '/import/staging'}
            className="text-um-link underline"
          >
            All rows
          </Link>
        ) : null}
        {importBatchId ? <span className="text-um-text">|</span> : null}
        {importBatchId ? (
          <span className="text-um-text">Filtered by import batch</span>
        ) : (
          <span className="text-um-text">Full table (no import batch filter)</span>
        )}
      </div>

      <div className="overflow-x-auto border border-um-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-um-table-header">
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">id</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Batch</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Imported</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Verified</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Data (preview)</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Import error</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-um-text text-center border border-um-border"
                >
                  <p className="text-black font-medium mb-2">No rows on this page</p>
                  <p className="text-sm mb-4">
                    Import a CSV or try “All rows” if a batch filter returned nothing.
                  </p>
                  <Link
                    href="/import"
                    className="inline-flex justify-center min-w-[150px] px-4 py-2.5 text-sm font-medium text-white bg-um-primary no-underline hover:bg-um-primary-hover"
                  >
                    + New CSV import
                  </Link>
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.error || row.errorMessage
                      ? 'bg-amber-50/80 hover:bg-amber-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-2.5 py-2.5 font-mono text-xs border border-um-border">
                    {row.id}
                  </td>
                  <td className="px-2.5 py-2.5 font-mono text-xs border border-um-border text-um-text">
                    {row.importBatchId ?? '—'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">
                    {row.imported ? 'yes' : 'no'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">
                    {row.verified ? 'yes' : 'no'}
                  </td>
                  <td className="px-2.5 py-2.5 text-um-text max-w-md truncate border border-um-border">
                    {stagingDataPreview(row.data)}
                  </td>
                  <td className="px-2.5 py-2.5 text-red-700 text-xs border border-um-border">
                    {row.errorMessage ?? row.error ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {nextHref ? (
        <div className="space-y-1">
          <Link
            href={nextHref}
            className="inline-flex items-center justify-center min-w-[150px] px-3 py-2.5 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Load next page
          </Link>
        </div>
      ) : null}

      <div className="pt-2 border-t border-um-border">
        <p className="text-sm font-medium text-black mb-2">Step 3 — Users</p>
        <Link
          href="/users"
          className="inline-flex justify-center min-w-[180px] px-4 py-2.5 text-sm font-medium text-white bg-um-primary no-underline hover:bg-um-primary-hover"
        >
          Open user list
        </Link>
      </div>
    </div>
  );
}

export default function ImportStagingPage() {
  return (
    <>
      <div className="px-5 pt-6 pb-0">
        <PageBreadcrumb
          items={[
            { label: 'Users', href: '/users' },
            { label: 'Import', href: '/import' },
            { label: 'Staging' },
          ]}
        />
        <div className="space-y-2">
          <h1 className="text-um-heading text-xl font-semibold">Staging (review)</h1>
          <ImportWizardStepper current={2} />
        </div>
      </div>
      <Suspense fallback={<p className="px-5 py-6 text-um-text opacity-80">Loading…</p>}>
        <StagingListInner />
      </Suspense>
    </>
  );
}
