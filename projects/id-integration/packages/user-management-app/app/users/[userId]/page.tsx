'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { UpdateUserRequest, User } from '@/types/user';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.userId;
  const userId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
        const text = await res.text();
        if (!res.ok) {
          try {
            const j = JSON.parse(text) as { message?: string };
            setLoadError(j.message ?? text);
          } catch {
            setLoadError(text || res.statusText);
          }
          setUser(null);
          return;
        }
        const u = JSON.parse(text) as User;
        if (!cancelled) {
          setUser(u);
          setEmail(u.email ?? '');
          setEnabled(u.enabled !== false);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setActionError(null);
    setSaving(true);
    try {
      const body: UpdateUserRequest = {
        email,
        enabled,
      };
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text) as { message?: string };
          setActionError(j.message ?? text);
        } catch {
          setActionError(text || res.statusText);
        }
        return;
      }
      const u = JSON.parse(text) as User;
      setUser(u);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!userId) return;
    if (!globalThis.confirm('Delete this user? This cannot be undone.')) return;
    setActionError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text) as { message?: string };
          setActionError(j.message ?? text);
        } catch {
          setActionError(text || res.statusText);
        }
        return;
      }
      router.push('/users');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <p className="px-5 py-6 text-red-600">Invalid user ID</p>;
  }
  if (loading) {
    return <p className="px-5 py-6 text-um-text opacity-80">Loading…</p>;
  }
  if (loadError || !user) {
    return (
      <div className="px-5 py-6 space-y-4">
        <p className="text-red-600">{loadError ?? 'User not found'}</p>
        <Link href="/users" className="text-um-link no-underline hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-um-heading text-xl font-semibold">{user.username}</h1>
        <p className="text-sm text-um-text font-mono mt-1">{user.userId}</p>
        <p className="text-sm mt-2 text-black">
          Status: <span className="font-semibold">{user.status}</span>
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-4 border border-um-border p-4">
        <h2 className="text-um-heading text-sm font-semibold">Edit</h2>
        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-black">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full max-w-[22rem] border border-um-border px-2 py-1.5 text-sm text-black box-border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <label htmlFor="enabled" className="text-sm text-black">
            Enabled
          </label>
        </div>
        {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center min-w-[150px] px-0 py-3 text-sm font-medium text-white bg-um-primary border-0 cursor-pointer hover:bg-um-primary-hover active:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="inline-flex justify-center min-w-[150px] px-0 py-3 text-sm font-medium text-white bg-um-deny border-0 cursor-pointer hover:bg-um-deny-hover active:bg-red-600 disabled:opacity-50"
          >
            Delete user
          </button>
          <Link
            href="/users"
            className="inline-flex items-center justify-center min-w-[150px] px-0 py-3 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
