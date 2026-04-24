'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageBreadcrumb } from '@/app/components/PageBreadcrumb';
import {
  BATCH_DELETE_CHUNK,
  chunkArray,
  fetchAllStagingIds,
  fetchAllUsernames,
} from '@/lib/management-bulk-helpers';
import type { BatchDeleteStagingUsersResponse } from '@/types/staging';
import type { BatchDeleteUsersResponse } from '@/types/user';

type StepResult = {
  label: string;
  batches: number;
  successItems: number;
  failedItems: number;
  errors: string[];
};

const DELETE_PHRASE = 'DELETE ALL';

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { message?: string };
    return j.message ?? text;
  } catch {
    return text;
  }
}

export default function DataInitPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [stagingCount, setStagingCount] = useState(0);
  const [cognitoCount, setCognitoCount] = useState(0);
  const [understand, setUnderstand] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState<'idle' | 'staging' | 'cognito' | 'done'>(
    'idle'
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [sIds, uNames] = await Promise.all([
        fetchAllStagingIds(),
        fetchAllUsernames(),
      ]);
      setStagingCount(sIds.length);
      setCognitoCount(uNames.length);
    } catch (e) {
      setSummaryError(
        e instanceof Error ? e.message : 'Failed to load summary counts'
      );
      setStagingCount(0);
      setCognitoCount(0);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  async function runBatchDelete(
    path: string,
    bodyKey: 'usernames' | 'ids',
    values: string[]
  ): Promise<BatchDeleteUsersResponse | BatchDeleteStagingUsersResponse> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [bodyKey]: values }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(parseErrorBody(text));
    if (path === '/api/users/batch-delete') {
      return JSON.parse(text) as BatchDeleteUsersResponse;
    }
    return JSON.parse(text) as BatchDeleteStagingUsersResponse;
  }

  async function executeDestroy() {
    setShowModal(false);
    setBusy(true);
    setError(null);
    setMessage('Refreshing target lists…');
    setResults(null);
    setProgress('idle');

    const steps: StepResult[] = [];

    try {
      const [stagingIds, usernames] = await Promise.all([
        fetchAllStagingIds(),
        fetchAllUsernames(),
      ]);
      setStagingCount(stagingIds.length);
      setCognitoCount(usernames.length);

      // --- Staging
      setProgress('staging');
      setMessage('Deleting staging…');
      const stagingChunks = chunkArray(stagingIds, BATCH_DELETE_CHUNK);
      if (stagingIds.length === 0) {
        steps.push({
          label: 'Staging',
          batches: 0,
          successItems: 0,
          failedItems: 0,
          errors: [],
        });
      } else {
        const stagingErrors: string[] = [];
        let successStaging = 0;
        let failedStaging = 0;
        for (const chunk of stagingChunks) {
          const r = (await runBatchDelete(
            '/api/staging/users/batch-delete',
            'ids',
            chunk
          )) as BatchDeleteStagingUsersResponse;
          successStaging += r.successCount;
          failedStaging += r.failureCount;
          if (r.errors) {
            for (const e of r.errors) {
              stagingErrors.push(`${e.id}: ${e.message}`);
            }
          }
        }
        steps.push({
          label: 'Staging',
          batches: stagingChunks.length,
          successItems: successStaging,
          failedItems: failedStaging,
          errors: stagingErrors,
        });
      }

      // --- Cognito
      setProgress('cognito');
      setMessage('Deleting Cognito users…');
      const userChunks = chunkArray(usernames, BATCH_DELETE_CHUNK);
      if (usernames.length === 0) {
        steps.push({
          label: 'Cognito',
          batches: 0,
          successItems: 0,
          failedItems: 0,
          errors: [],
        });
      } else {
        const userErrors: string[] = [];
        let successUsers = 0;
        let failedUsers = 0;
        for (const chunk of userChunks) {
          const r = (await runBatchDelete(
            '/api/users/batch-delete',
            'usernames',
            chunk
          )) as BatchDeleteUsersResponse;
          successUsers += r.successCount;
          failedUsers += r.failureCount;
          if (r.errors) {
            for (const e of r.errors) {
              userErrors.push(`${e.username}: ${e.message}`);
            }
          }
        }
        steps.push({
          label: 'Cognito',
          batches: userChunks.length,
          successItems: successUsers,
          failedItems: failedUsers,
          errors: userErrors,
        });
      }

      setResults(steps);
      setProgress('done');
      setMessage('Completed.');
      const anyFailure = steps.some((s) => s.failedItems > 0);
      if (!anyFailure) {
        router.push('/users?toast=dataInit');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(null);
      setProgress('idle');
      if (steps.length > 0) {
        setResults(steps);
        setError(
          `${msg} (Partial results are shown; staging may have completed before this error.)`
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const canOpenModal =
    understand &&
    confirmText === DELETE_PHRASE &&
    !summaryLoading &&
    !summaryError;

  return (
    <>
      <div className="px-5 pt-6 pb-0 max-w-3xl">
        <PageBreadcrumb
          items={[{ label: 'Users', href: '/users' }, { label: 'Data reset' }]}
        />
        <h1 className="text-um-heading text-xl font-semibold">Data reset</h1>
        <p className="text-sm text-um-text mt-2 max-w-2xl">
          Removes every row in the import staging table and every user returned by
          the management API (Cognito <code className="text-xs">ListUsers</code>).
          For demo environments only.
        </p>
      </div>
      <div className="px-5 py-6 max-w-3xl space-y-4">
        <p className="text-sm text-red-900 border border-red-200 bg-red-50 px-3 py-2">
          Destructive: cannot be undone. Do not use in production.
        </p>

        <section className="border border-um-border p-4 bg-gray-50/80 space-y-2">
          <h2 className="text-sm font-semibold text-black">Current scope</h2>
          {summaryLoading ? (
            <p className="text-sm text-um-text">Loading counts…</p>
          ) : summaryError ? (
            <p className="text-sm text-red-700">{summaryError}</p>
          ) : (
            <ul className="text-sm text-um-text list-none p-0 m-0 space-y-1">
              <li>
                <span className="font-medium text-black">Staging:</span>{' '}
                {stagingCount} row{stagingCount === 1 ? '' : 's'}
              </li>
              <li>
                <span className="font-medium text-black">Cognito (listed):</span>{' '}
                {cognitoCount} user{cognitoCount === 1 ? '' : 's'}
              </li>
            </ul>
          )}
          <button
            type="button"
            className="text-sm text-um-link underline"
            onClick={() => void loadSummary()}
            disabled={summaryLoading || busy}
          >
            Refresh counts
          </button>
        </section>

        <label className="flex items-start gap-2 text-sm text-um-text cursor-pointer max-w-lg">
          <input
            type="checkbox"
            className="mt-1"
            checked={understand}
            onChange={(e) => setUnderstand(e.target.checked)}
            disabled={busy}
          />
          <span>I understand that staging and Cognito users in this project will be
          permanently deleted.</span>
        </label>

        <div>
          <label
            htmlFor="delete-all-confirm"
            className="block text-sm font-medium text-black mb-1"
          >
            Type {DELETE_PHRASE} to enable the button
          </label>
          <input
            id="delete-all-confirm"
            className="w-full max-w-sm border border-um-border px-2 py-1.5 text-sm font-mono"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            disabled={busy}
            placeholder={DELETE_PHRASE}
          />
        </div>

        <div className="h-1.5 w-full max-w-lg rounded bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-um-titlebar transition-[width] duration-300"
            style={{
              width: `${
                progress === 'idle'
                  ? 0
                  : progress === 'staging'
                    ? 35
                    : progress === 'cognito'
                      ? 70
                      : progress === 'done'
                        ? 100
                        : 0
              }%`,
              backgroundColor:
                progress === 'done' ? 'rgb(5 150 105)' : undefined,
            }}
            aria-hidden
          />
        </div>
        {busy && progress !== 'idle' && progress !== 'done' ? (
          <p className="text-xs text-um-text" role="status">
            {progress === 'staging' ? '1/2: Staging' : '2/2: Cognito'}
          </p>
        ) : null}

        <button
          type="button"
          className="inline-flex justify-center min-w-[200px] px-4 py-2.5 text-sm font-medium text-white bg-red-700 border border-red-800 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={busy || !canOpenModal}
          onClick={() => setShowModal(true)}
        >
          {busy ? 'Running…' : 'Run data reset'}
        </button>

        {message ? (
          <p className="text-sm text-um-text" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {results ? (
          <ul className="text-sm space-y-3 list-none p-0 m-0">
            {results.map((r) => (
              <li
                key={r.label}
                className="border border-um-border p-3 bg-gray-50/80"
              >
                <p className="font-semibold text-black">{r.label}</p>
                <p className="text-um-text mt-1">
                  Batches: {r.batches} / succeeded: {r.successItems} / failed:{' '}
                  {r.failedItems}
                </p>
                {r.errors.length > 0 ? (
                  <ul className="mt-2 text-xs text-red-800 list-disc pl-5 max-h-40 overflow-y-auto">
                    {r.errors.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal
          aria-labelledby="data-init-modal-title"
        >
          <div className="w-full max-w-md rounded border border-um-border bg-white p-5 shadow-lg">
            <h2
              id="data-init-modal-title"
              className="text-lg font-semibold text-black"
            >
              Confirm reset
            </h2>
            <p className="text-sm text-um-text mt-2">
              This will delete{' '}
              <strong>{stagingCount}</strong> staging row(s) and{' '}
              <strong>{cognitoCount}</strong> Cognito user(s) using the list APIs.
              This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm border border-um-border bg-white"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800"
                onClick={() => void executeDestroy()}
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
