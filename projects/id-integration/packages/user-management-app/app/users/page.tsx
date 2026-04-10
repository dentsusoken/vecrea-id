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
    return <p className="px-4 py-6 text-um-text opacity-80">Loading…</p>;
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
    <div className="px-5 py-6 space-y-4">
      <h1 className="text-um-heading text-xl font-semibold">Users</h1>
      <div className="overflow-x-auto border border-um-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-um-table-header">
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">User ID</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Username</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Email</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">Status</th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border w-24" />
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-um-text text-center border border-um-border">
                  No users
                </td>
              </tr>
            ) : (
              data.items.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="px-2.5 py-2.5 font-mono text-xs border border-um-border">{u.userId}</td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">{u.username}</td>
                  <td className="px-2.5 py-2.5 border border-um-border text-um-text">
                    {u.email ?? '—'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">{u.status}</td>
                  <td className="px-2.5 py-2.5 border border-um-border">
                    <Link
                      href={`/users/${encodeURIComponent(u.userId)}`}
                      className="text-um-link no-underline hover:underline"
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
          className="inline-flex items-center justify-center min-w-[150px] px-3 py-2.5 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
        >
          Next page
        </Link>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<p className="px-5 py-6 text-um-text opacity-80">Loading…</p>}>
      <UsersListInner />
    </Suspense>
  );
}
