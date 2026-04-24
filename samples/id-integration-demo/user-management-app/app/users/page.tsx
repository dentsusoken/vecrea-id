'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { UsersEntranceToast } from '@/app/users/users-entrance-toast';
import {
  clearUsersPaginationStack,
  usersPaginationPopForBack,
  usersPaginationPushForNext,
  usersPaginationStackDepth,
} from '@/lib/users-pagination-stack';
import type { ListUsersResponse, User } from '@/types/user';

function UsersTableSkeleton() {
  return (
    <div
      className="px-5 py-6 space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="h-7 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="border border-um-border overflow-hidden">
        <div className="h-11 bg-um-table-header/80 animate-pulse" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 border-t border-um-border bg-gray-50/90 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function buildUsersListUrl(
  next: { token?: string | null; q?: string | null }
): string {
  const qs = new URLSearchParams();
  if (next.q) qs.set('q', next.q);
  if (next.token) qs.set('paginationToken', next.token);
  const s = qs.toString();
  return s ? `/users?${s}` : '/users';
}

function UsersListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('paginationToken');
  const q = searchParams.get('q')?.trim() ?? '';
  const [data, setData] = useState<ListUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState(q);
  const [, setStackVersion] = useState(0);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput.trim() === q) return;
      clearUsersPaginationStack();
      setStackVersion((v) => v + 1);
      const nq = qInput.trim();
      const next = buildUsersListUrl({ q: nq || null });
      router.replace(next);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput, q, router]);

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

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q) return data.items;
    const n = q.toLowerCase();
    return data.items.filter(
      (u) =>
        u.username.toLowerCase().includes(n) ||
        (u.email && u.email.toLowerCase().includes(n)) ||
        u.userId.toLowerCase().includes(n)
    );
  }, [data, q]);

  function openUser(u: User) {
    router.push(`/users/${encodeURIComponent(u.username)}`);
  }

  if (loading) {
    return <UsersTableSkeleton />;
  }
  if (error) {
    return <p className="px-5 py-6 text-red-600">{error}</p>;
  }
  if (!data) {
    return null;
  }

  const backDepth = usersPaginationStackDepth();
  const nextToken = data.paginationToken
    ? encodeURIComponent(data.paginationToken)
    : null;
  const nextHref =
    data.paginationToken && nextToken
      ? buildUsersListUrl({
          token: data.paginationToken,
          q: q || null,
        })
      : null;

  return (
    <div className="px-5 py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 gap-y-3">
        <h1 className="text-um-heading text-xl font-semibold">Users</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/users/new"
            className="inline-flex justify-center min-w-[150px] px-4 py-2.5 text-sm font-medium text-white bg-um-primary no-underline hover:bg-um-primary-hover active:bg-blue-700"
          >
            + New user
          </Link>
          <Link
            href="/import"
            className="inline-flex justify-center min-w-[130px] px-4 py-2.5 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Import
          </Link>
        </div>
      </div>

      <div className="max-w-md">
        <label htmlFor="user-filter-q" className="text-sm font-medium text-black block mb-1">
          Filter (this page)
        </label>
        <input
          id="user-filter-q"
          className="w-full border border-um-border px-2 py-1.5 text-sm"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="username, email, or sub (client-side, current page only)"
        />
        <p className="text-xs text-um-text mt-1 max-w-prose">
          Matches only users on the current list page. Change filter to return to the first page
          and clear pagination.
        </p>
      </div>

      <div className="overflow-x-auto border border-um-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-um-table-header">
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                User ID (sub)
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                Username
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                Email
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                Status
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                Enabled
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border">
                Phone
              </th>
              <th className="px-2.5 py-2.5 font-semibold border border-um-border w-24">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-um-text text-center border border-um-border"
                >
                  <p className="text-black font-medium mb-2">
                    {q
                      ? 'No matches on this page for your filter'
                      : 'No users in this pool page'}
                  </p>
                  <p className="text-sm mb-4">
                    Create a user or use Import to get started.
                  </p>
                  <Link
                    href="/users/new"
                    className="inline-flex justify-center min-w-[150px] px-4 py-2.5 text-sm font-medium text-white bg-um-primary no-underline hover:bg-um-primary-hover"
                  >
                    + New user
                  </Link>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.userId}
                  role="link"
                  tabIndex={0}
                  aria-label={`User ${u.username}, open detail`}
                  className="cursor-pointer hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-um-primary"
                  onClick={() => openUser(u)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openUser(u);
                    }
                  }}
                >
                  <td className="px-2.5 py-2.5 font-mono text-xs border border-um-border">
                    {u.userId}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">
                    {u.username}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-um-text">
                    {u.email ?? '—'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-black">
                    {u.status}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-um-text">
                    {u.enabled === false ? 'No' : 'Yes'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border text-um-text">
                    {u.phoneNumber ?? '—'}
                  </td>
                  <td className="px-2.5 py-2.5 border border-um-border">
                    <Link
                      href={`/users/${encodeURIComponent(u.username)}`}
                      className="text-um-link no-underline hover:underline"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
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

      <div className="flex flex-wrap items-center gap-2">
        {backDepth > 0 ? (
          <button
            type="button"
            onClick={() => {
              const { targetToken, empty } = usersPaginationPopForBack();
              if (empty) return;
              setStackVersion((v) => v + 1);
              if (targetToken === null) {
                router.push(buildUsersListUrl({ q: q || null }));
              } else {
                router.push(
                  buildUsersListUrl({ token: targetToken, q: q || null })
                );
              }
            }}
            className="inline-flex items-center justify-center min-w-[150px] px-3 py-2.5 text-sm border border-um-border text-black bg-white hover:bg-gray-50"
          >
            Previous page
          </button>
        ) : null}
        {nextHref ? (
          <Link
            href={nextHref}
            onClick={() => {
              usersPaginationPushForNext(token);
            }}
            className="inline-flex items-center justify-center min-w-[150px] px-3 py-2.5 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Next page
          </Link>
        ) : null}
      </div>
      {nextHref || backDepth > 0 ? (
        <p className="text-xs text-um-text max-w-xl">
          Cognito returns users in up to 60 per page. Use Next/Previous to move through
          the pool (order is pool-defined, not sorted).
        </p>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <>
      <Suspense fallback={null}>
        <UsersEntranceToast />
      </Suspense>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersListInner />
      </Suspense>
    </>
  );
}
