'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
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
        DynamoDB staging rows for the user-import pipeline.{' '}
        <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
          imported
        </code>{' '}
        is set when Cognito import or User Migration has completed;{' '}
        <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
          verified
        </code>{' '}
        reflects CSV email/phone verification flags. Scan paging — use Next sparingly.
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
                <td colSpan={5} className="px-3 py-8 text-um-text text-center border border-um-border">
                  No staging rows
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
        <Link
          href={nextHref}
          className="inline-flex items-center justify-center min-w-[150px] px-3 py-2.5 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
        >
          Next page
        </Link>
      ) : null}
    </div>
  );
}

export default function StagingPage() {
  return (
    <Suspense fallback={<p className="px-5 py-6 text-um-text opacity-80">Loading…</p>}>
      <div className="px-5 pt-6 pb-0">
        <h1 className="text-um-heading text-xl font-semibold">Import staging</h1>
      </div>
      <StagingListInner />
    </Suspense>
  );
}
