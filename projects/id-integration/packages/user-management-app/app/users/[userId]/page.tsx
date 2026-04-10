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
    return <p className="px-4 py-6 text-red-600">Invalid user ID</p>;
  }
  if (loading) {
    return <p className="px-4 py-6 text-zinc-500">Loading…</p>;
  }
  if (loadError || !user) {
    return (
      <div className="px-4 py-6 space-y-4">
        <p className="text-red-600">{loadError ?? 'User not found'}</p>
        <Link href="/users" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{user.username}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1">{user.userId}</p>
        <p className="text-sm mt-2">
          Status: <span className="font-medium">{user.status}</span>
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-4 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <h2 className="text-sm font-medium">Edit</h2>
        <div>
          <label htmlFor="email" className="block text-sm mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm"
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
          <label htmlFor="enabled" className="text-sm">
            Enabled
          </label>
        </div>
        {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="rounded-md border border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 px-4 py-2 text-sm disabled:opacity-50"
          >
            Delete user
          </button>
          <Link
            href="/users"
            className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm"
          >
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
