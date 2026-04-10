'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { ListUsersResponse } from '@/types/user';

function UsersListInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('paginationToken');
  const [data, setData] = useState<ListUsersResponse | null>(null);
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
        const res = await fetch(`/api/users${qs.size ? `?${qs}` : ''}`);
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
        if (!cancelled) setData(JSON.parse(text) as ListUsersResponse);
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
    ? `/users?paginationToken=${encodeURIComponent(data.paginationToken)}`
    : null;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2 font-medium">User ID</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium w-24" />
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-zinc-500 text-center">
                  No users
                </td>
              </tr>
            ) : (
              data.items.map((u) => (
                <tr
                  key={u.userId}
                  className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                >
                  <td className="px-3 py-2 font-mono text-xs">{u.userId}</td>
                  <td className="px-3 py-2">{u.username}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {u.email ?? '—'}
                  </td>
                  <td className="px-3 py-2">{u.status}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/users/${encodeURIComponent(u.userId)}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </Link>
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

export default function UsersPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-zinc-500">Loading…</p>}>
      <UsersListInner />
    </Suspense>
  );
}
