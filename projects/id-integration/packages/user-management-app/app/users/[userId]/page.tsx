'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import {
  extraAttributesToRows,
  pickExtraAttributes,
  pickProfileFromAttributes,
} from '@/lib/cognito-user-ui';
import type { UpdateUserRequest, User } from '@/types/user';

const inputClass =
  'w-full max-w-[28rem] border border-um-border px-2 py-1.5 text-sm text-black box-border';

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type ExtraRow = { id: string; key: string; value: string };

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  /** Cognito `Username` (API path segment), not `sub`. */
  const rawId = params.userId;
  const usernameParam =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneNumberVerified, setPhoneNumberVerified] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saveSuccess) return;
    const t = globalThis.setTimeout(() => setSaveSuccess(false), 4000);
    return () => globalThis.clearTimeout(t);
  }, [saveSuccess]);

  useEffect(() => {
    if (!usernameParam) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(usernameParam)}`);
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
          setPhoneNumber(u.phoneNumber ?? '');
          setEmailVerified(u.emailVerified === true);
          setPhoneNumberVerified(u.phoneNumberVerified === true);
          setEnabled(u.enabled !== false);
          const profile = pickProfileFromAttributes(u.attributes);
          setGivenName(profile.given_name);
          setFamilyName(profile.family_name);
          setFullName(profile.name);
          setExtraRows(
            extraAttributesToRows(pickExtraAttributes(u.attributes))
          );
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
  }, [usernameParam]);

  function addExtraRow() {
    setExtraRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), key: '', value: '' },
    ]);
  }

  function removeExtraRow(id: string) {
    setExtraRows((rows) => rows.filter((r) => r.id !== id));
  }

  function updateExtraRow(id: string, patch: Partial<Pick<ExtraRow, 'key' | 'value'>>) {
    setExtraRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!usernameParam) return;
    setActionError(null);
    setSaveSuccess(false);

    const attrs: Record<string, string> = {};
    const gn = givenName.trim();
    if (gn) attrs.given_name = gn;
    const fn = familyName.trim();
    if (fn) attrs.family_name = fn;
    const n = fullName.trim();
    if (n) attrs.name = n;

    const seen = new Set<string>();
    for (const row of extraRows) {
      const k = row.key.trim();
      if (!k) continue;
      if (seen.has(k)) {
        setActionError(`Duplicate attribute key: ${k}`);
        return;
      }
      seen.add(k);
      attrs[k] = row.value;
    }

    const body: UpdateUserRequest = {
      enabled,
      email: email.trim() === '' ? null : email.trim(),
      emailVerified,
      phoneNumberVerified,
      phoneNumber: phoneNumber.trim() === '' ? null : phoneNumber.trim(),
    };
    if (Object.keys(attrs).length > 0) body.attributes = attrs;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(usernameParam)}`, {
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
      setSaveSuccess(true);
      setUser(u);
      setEmail(u.email ?? '');
      setPhoneNumber(u.phoneNumber ?? '');
      setEmailVerified(u.emailVerified === true);
      setPhoneNumberVerified(u.phoneNumberVerified === true);
      setEnabled(u.enabled !== false);
      const profile = pickProfileFromAttributes(u.attributes);
      setGivenName(profile.given_name);
      setFamilyName(profile.family_name);
      setFullName(profile.name);
      setExtraRows(extraAttributesToRows(pickExtraAttributes(u.attributes)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!usernameParam) return;
    if (!globalThis.confirm('Delete this user? This cannot be undone.')) return;
    setActionError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(usernameParam)}`, {
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

  if (!usernameParam) {
    return <p className="px-5 py-6 text-red-600">Invalid user</p>;
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

  const hasMfa =
    Boolean(user.preferredMfaSetting) ||
    (user.userMfaSettingList?.length ?? 0) > 0 ||
    (user.mfaOptions?.length ?? 0) > 0;

  const attributesJson = user.attributes
    ? JSON.stringify(user.attributes, null, 2)
    : '{}';

  return (
    <div className="px-5 py-6 max-w-3xl space-y-8">
      <PageBreadcrumb
        items={[
          { label: 'Users', href: '/users' },
          { label: user.username },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-um-heading text-xl font-semibold">{user.username}</h1>
        <dl className="text-sm space-y-1 text-black">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-um-text min-w-[8rem]">User ID (sub)</dt>
            <dd className="font-mono text-xs">{user.userId}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-um-text min-w-[8rem]">Status</dt>
            <dd className="font-semibold">{user.status}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-um-text min-w-[8rem]">Enabled</dt>
            <dd>{user.enabled === false ? 'No' : 'Yes'}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-um-text min-w-[8rem]">Created</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-um-text min-w-[8rem]">Last modified</dt>
            <dd>{formatDateTime(user.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={onSave} className="space-y-4 border border-um-border p-4">
        <h2 className="text-um-heading text-sm font-semibold">Edit</h2>
        {saveSuccess ? (
          <p
            role="status"
            className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2"
          >
            Changes saved successfully.
          </p>
        ) : null}
        <p className="text-xs text-um-text">
          Updates mirror the management API: top-level fields for email, phone, verification flags,
          and enabled; profile and custom keys go in <code className="bg-[#f4f4f4] px-0.5 border border-um-border">attributes</code>.
          Removing a row below does not delete that attribute in Cognito (API has no generic delete).
        </p>

        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-black">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm mb-1 text-black">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+819012345678"
            className={inputClass}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
            />
            Email verified
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={phoneNumberVerified}
              onChange={(e) => setPhoneNumberVerified(e.target.checked)}
            />
            Phone verified
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled
          </label>
        </div>

        <fieldset className="space-y-3 pt-2 border-t border-um-border">
          <legend className="text-sm font-semibold text-black mb-1">Profile attributes</legend>
          <div>
            <label htmlFor="given_name" className="block text-sm mb-1 text-black">
              Given name
            </label>
            <input
              id="given_name"
              className={inputClass}
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="family_name" className="block text-sm mb-1 text-black">
              Family name
            </label>
            <input
              id="family_name"
              className={inputClass}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm mb-1 text-black">
              Full name
            </label>
            <input
              id="name"
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 pt-2 border-t border-um-border">
          <legend className="text-sm font-semibold text-black mb-1">
            Other attributes (name → value)
          </legend>
          {extraRows.length === 0 ? (
            <p className="text-xs text-um-text">No extra attributes.</p>
          ) : (
            <ul className="space-y-2">
              {extraRows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Attribute name"
                    className="flex-1 min-w-[10rem] max-w-[14rem] border border-um-border px-2 py-1.5 text-sm text-black font-mono"
                    value={row.key}
                    onChange={(e) => updateExtraRow(row.id, { key: e.target.value })}
                    placeholder="custom:field"
                  />
                  <input
                    aria-label="Attribute value"
                    className="flex-1 min-w-[10rem] border border-um-border px-2 py-1.5 text-sm text-black"
                    value={row.value}
                    onChange={(e) => updateExtraRow(row.id, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    className="text-sm text-red-700 border border-red-300 px-2 py-1 bg-white hover:bg-red-50"
                    onClick={() => removeExtraRow(row.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="text-sm border border-um-border px-3 py-1.5 bg-white hover:bg-gray-50 text-black"
            onClick={addExtraRow}
          >
            Add attribute
          </button>
        </fieldset>

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

      {hasMfa ? (
        <details className="border border-um-border p-4 group">
          <summary className="text-um-heading text-sm font-semibold cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-um-text group-open:rotate-90 transition-transform inline-block">
              ▸
            </span>
            MFA (read-only)
          </summary>
          <div className="mt-3 space-y-2 pt-2 border-t border-um-border">
            {user.preferredMfaSetting ? (
              <p className="text-sm text-black">
                Preferred:{' '}
                <span className="font-mono">{user.preferredMfaSetting}</span>
              </p>
            ) : null}
            {user.userMfaSettingList?.length ? (
              <p className="text-sm text-black">
                Active methods:{' '}
                <span className="font-mono">{user.userMfaSettingList.join(', ')}</span>
              </p>
            ) : null}
            {user.mfaOptions?.length ? (
              <pre className="text-xs bg-[#f8f8f8] border border-um-border border-l-4 border-l-um-pre-accent p-3 overflow-x-auto text-black mt-2">
                {JSON.stringify(user.mfaOptions, null, 2)}
              </pre>
            ) : null}
            <p className="text-xs text-um-text">
              MFA settings are read-only here; manage them in Cognito or your IdP flows.
            </p>
          </div>
        </details>
      ) : null}

      <details className="border border-um-border p-4 group">
        <summary className="text-um-heading text-sm font-semibold cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
          <span className="text-um-text group-open:rotate-90 transition-transform inline-block">
            ▸
          </span>
          All Cognito attributes (JSON)
        </summary>
        <pre className="text-xs bg-[#f8f8f8] border border-um-border border-l-4 border-l-um-pre-accent p-3 overflow-x-auto text-black mt-3">
          {attributesJson}
        </pre>
      </details>
    </div>
  );
}
