'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import { useToast } from '@/lib/toast-context';
import type { CreateUserRequest, User } from '@/types/user';

const inputClass =
  'w-full max-w-[28rem] border border-um-border px-2 py-1.5 text-sm text-black box-border';

export default function NewUserPage() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [name, setName] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [suppressInvitation, setSuppressInvitation] = useState(false);
  const [markEmailVerified, setMarkEmailVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    globalThis.addEventListener('beforeunload', h);
    return () => globalThis.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: CreateUserRequest = { username: username.trim() };
      const em = email.trim();
      if (em) body.email = em;

      const attrs: Record<string, string> = {};
      const phone = phoneNumber.trim();
      if (phone) attrs.phone_number = phone;
      const gn = givenName.trim();
      if (gn) attrs.given_name = gn;
      const fn = familyName.trim();
      if (fn) attrs.family_name = fn;
      const full = name.trim();
      if (full) attrs.name = full;
      if (markEmailVerified) attrs.email_verified = 'true';

      if (Object.keys(attrs).length > 0) body.attributes = attrs;

      const temp = temporaryPassword.trim();
      if (temp) body.temporaryPassword = temp;
      if (suppressInvitation) body.suppressInvitation = true;

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
      const user = JSON.parse(text) as User;
      setDirty(false);
      showToast('User created');
      router.push(`/users/${encodeURIComponent(user.username)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-6 max-w-2xl">
      <PageBreadcrumb
        items={[
          { label: 'Users', href: '/users' },
          { label: 'New user' },
        ]}
      />
      <h1 className="text-um-heading text-xl font-semibold mb-4">New user</h1>
      <p className="text-sm text-um-text -mt-2 mb-4">
        Leave changes?{' '}
        <Link
          href="/users"
          onClick={(e) => {
            if (!dirty) return;
            if (!window.confirm('Discard the new user form?')) e.preventDefault();
          }}
          className="text-um-link"
        >
          Back to list
        </Link>
      </p>
      <form
        onSubmit={onSubmit}
        onInput={() => setDirty(true)}
        className="space-y-4"
      >
        <fieldset>
          <legend className="text-um-heading text-sm font-semibold mb-2 block">Required</legend>
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1 text-black">
              Username <span className="text-red-600">*</span>
            </label>
            <input
              id="username"
              name="username"
              required
              autoComplete="username"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-um-text mt-1 max-w-[28rem]">
              Cognito sign-in identifier; API paths use this username (not sub).
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-3 pt-2 border-t border-um-border">
          <legend className="text-um-heading text-sm font-semibold mb-1 block">Contact</legend>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-black">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1 text-black">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+819012345678"
              className={inputClass}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-um-text mt-1 max-w-[28rem]">
              E.164 format per Cognito (e.g. +81…). Stored as the{' '}
              <code className="text-xs bg-[#f4f4f4] px-0.5 border border-um-border">phone_number</code>{' '}
              attribute.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="email_verified"
              type="checkbox"
              checked={markEmailVerified}
              onChange={(e) => setMarkEmailVerified(e.target.checked)}
            />
            <label htmlFor="email_verified" className="text-sm text-black">
              Set <code className="text-xs bg-[#f4f4f4] px-0.5 border border-um-border">email_verified</code>{' '}
              to true on create
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3 pt-2 border-t border-um-border">
          <legend className="text-um-heading text-sm font-semibold mb-1 block">Profile (optional)</legend>
          <div>
            <label htmlFor="given_name" className="block text-sm font-medium mb-1 text-black">
              Given name
            </label>
            <input
              id="given_name"
              name="given_name"
              autoComplete="given-name"
              className={inputClass}
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="family_name" className="block text-sm font-medium mb-1 text-black">
              Family name
            </label>
            <input
              id="family_name"
              name="family_name"
              autoComplete="family-name"
              className={inputClass}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-black">
              Full name
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 pt-2 border-t border-um-border">
          <legend className="text-um-heading text-sm font-semibold mb-1 block">
            Sign-up options (optional)
          </legend>
          <div>
            <label
              htmlFor="temporaryPassword"
              className="block text-sm font-medium mb-1 text-black"
            >
              Temporary password
            </label>
            <input
              id="temporaryPassword"
              name="temporaryPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={inputClass}
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
            />
            <p className="text-xs text-um-text mt-1 max-w-[28rem]">
              When set, user is often in <strong>FORCE_CHANGE_PASSWORD</strong> until first sign-in.
              Minimum 8 characters if provided.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="suppress_invitation"
              type="checkbox"
              checked={suppressInvitation}
              onChange={(e) => setSuppressInvitation(e.target.checked)}
            />
            <label htmlFor="suppress_invitation" className="text-sm text-black">
              Suppress invitation message (Cognito <code className="text-xs bg-[#f4f4f4] px-0.5 border border-um-border">MessageAction: SUPPRESS</code>)
            </label>
          </div>
        </fieldset>

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
