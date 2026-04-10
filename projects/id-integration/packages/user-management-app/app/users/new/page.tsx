'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { CreateUserRequest } from '@/types/user';

export default function NewUserPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: CreateUserRequest = { username: username.trim() };
      const em = email.trim();
      if (em) body.email = em;
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      const user = JSON.parse(text) as { userId: string };
      router.push(`/users/${encodeURIComponent(user.userId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-6 max-w-md">
      <h1 className="text-um-heading text-xl font-semibold mb-4">New user</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1 text-black">
            Username <span className="text-red-600">*</span>
          </label>
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            className="w-full max-w-[22rem] border border-um-border px-2 py-1.5 text-sm text-black box-border"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-black">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full max-w-[22rem] border border-um-border px-2 py-1.5 text-sm text-black box-border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center min-w-[150px] px-0 py-3 text-sm font-medium text-white bg-um-primary border-0 cursor-pointer hover:bg-um-primary-hover active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
          <Link
            href="/users"
            className="inline-flex items-center justify-center min-w-[150px] px-0 py-3 text-sm border border-um-border text-black bg-white no-underline hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
