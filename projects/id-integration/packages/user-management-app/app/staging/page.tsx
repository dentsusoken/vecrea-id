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
    return <p className="px-4 py-6 text-zinc-500">Loading…</p>;
  }
  if (error) {
    return <p className="px-4 py-6 text-red-600">{error}</p>;
  }
  if (!data) {
    return null;
  }

  const nextHref = data.paginationToken
    ? `/staging?paginationToken=${encodeURIComponent(data.paginationToken)}`
    : null;

  return (
    <div className="px-4 py-6 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl">
        DynamoDB staging rows for the user-import pipeline.{' '}
        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
          imported
        </code>{' '}
        is set when Cognito import or User Migration has completed;{' '}
        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
          verified
        </code>{' '}
        reflects CSV email/phone verification flags. Scan paging — use Next sparingly.
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2 font-medium">id</th>
              <th className="px-3 py-2 font-medium">Imported</th>
              <th className="px-3 py-2 font-medium">Verified</th>
              <th className="px-3 py-2 font-medium">Data (preview)</th>
              <th className="px-3 py-2 font-medium">Import error</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-zinc-500 text-center">
                  No staging rows
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2">{row.imported ? 'yes' : 'no'}</td>
                  <td className="px-3 py-2">{row.verified ? 'yes' : 'no'}</td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 max-w-md truncate">
                    {stagingDataPreview(row.data)}
                  </td>
                  <td className="px-3 py-2 text-red-700 dark:text-red-400 text-xs">
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
          className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Next page
        </Link>
      ) : null}
    </div>
  );
}

export default function StagingPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-zinc-500">Loading…</p>}>
      <div className="px-4 pt-6">
        <h1 className="text-xl font-semibold">Import staging</h1>
      </div>
      <StagingListInner />
    </Suspense>
  );
}
