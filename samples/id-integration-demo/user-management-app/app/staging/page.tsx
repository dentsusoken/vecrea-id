'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import type { ListStagingUsersResponse } from '@/types/staging';

function stagingDataPreview(data: Record<string, unknown>): string {
  const email = data.email;
  const uname = data['cognito:username'];
  const parts: string[] = [];
  if (typeof uname === 'string') parts.push(`username: ${uname}`);
  if (typeof email === 'string') parts.push(`email: ${email}`);
  return parts.length > 0 ? parts.join(' · ') : JSON.stringify(data).slice(0, 120);
}

function StagingListInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('paginationToken');
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
  }, [token]);

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
    ? `/staging?paginationToken=${encodeURIComponent(data.paginationToken)}`
    : null;

  return (
    <div className="px-5 py-6 space-y-4">
      <p className="text-sm text-um-text max-w-3xl">
        DynamoDB staging rows for the user-import pipeline. Rows are created from{' '}
        <Link href="/users/import" className="text-um-link no-underline hover:underline">
          Import CSV
        </Link>
        .{' '}
        <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
          imported
        </code>{' '}
        is set when Cognito import or User Migration has completed;{' '}
        <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
          verified
        </code>{' '}
        reflects CSV email/phone verification flags. DynamoDB Scan paging — load additional
        chunks only when needed.
      </p>
      <div className="overflow-x-auto border border-um-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-um-table-header">
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">id</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Imported</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Verified</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Data (preview)</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Import error</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-um-text text-center border border-um-border">
                  <p className="text-black font-medium mb-2">No staging rows in this scan page</p>
                  <p className="text-sm mb-4">
                    Import a CSV to populate staging, or load the next page if more data exists.
                  </p>
                  <Link
                    href="/users/import"
                    className="inline-flex justify-center min-w-[150px] px-4 py-2.5 text-sm font-medium text-white bg-um-primary no-underline hover:bg-um-primary-hover"
                  >
                    Import CSV
                  </Link>
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-2.5 py-2.5 font-mono text-xs border border-um-border">{row.id}</td>
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
          <p className="text-xs text-um-text max-w-xl">
            Fetches the next DynamoDB Scan segment; order is not guaranteed across pages.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function StagingPage() {
  return (
    <>
      <div className="px-5 pt-6 pb-0">
        <PageBreadcrumb
          items={[
            { label: 'Users', href: '/users' },
            { label: 'Import staging' },
          ]}
        />
        <h1 className="text-um-heading text-xl font-semibold">Import staging</h1>
      </div>
      <Suspense fallback={<p className="px-5 py-6 text-um-text opacity-80">Loading…</p>}>
        <StagingListInner />
      </Suspense>
    </>
  );
}
