'use client';

import { useState } from 'react';
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

function parseErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { message?: string };
    return j.message ?? text;
  } catch {
    return text;
  }
}

export default function DataInitPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleInit() {
    const ok = window.confirm(
      'DynamoDB のステージング行と Cognito ユーザープール上の全ユーザーを削除します。取り消せません。続行しますか？\n' +
        'This removes all import staging rows and all listed Cognito users. Continue?'
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage('一覧を取得しています…');
    setResults(null);

    try {
      const [stagingIds, usernames] = await Promise.all([
        fetchAllStagingIds(),
        fetchAllUsernames(),
      ]);

      const steps: StepResult[] = [];
      const stagingChunks = chunkArray(stagingIds, BATCH_DELETE_CHUNK);
      const userChunks = chunkArray(usernames, BATCH_DELETE_CHUNK);

      if (stagingIds.length === 0) {
        steps.push({
          label: 'Staging テーブル',
          batches: 0,
          successItems: 0,
          failedItems: 0,
          errors: [],
        });
      } else {
        setMessage(
          `ステージングを削除中（${stagingIds.length} 行、${stagingChunks.length} バッチ）…`
        );
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
          label: 'Staging テーブル',
          batches: stagingChunks.length,
          successItems: successStaging,
          failedItems: failedStaging,
          errors: stagingErrors,
        });
      }

      if (usernames.length === 0) {
        steps.push({
          label: 'Cognito',
          batches: 0,
          successItems: 0,
          failedItems: 0,
          errors: [],
        });
      } else {
        setMessage(
          `Cognito ユーザーを削除中（${usernames.length} 件、${userChunks.length} バッチ）…`
        );
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
      setMessage('完了しました。');
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="px-5 pt-6 pb-0 max-w-3xl">
        <PageBreadcrumb
          items={[{ label: 'Users', href: '/users' }, { label: 'Data reset' }]}
        />
        <h1 className="text-um-heading text-xl font-semibold">データの初期化</h1>
        <p className="text-sm text-um-text mt-2">
          管理 APIの{' '}
          <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
            POST /staging/users/batch-delete
          </code>{' '}
          および{' '}
          <code className="text-xs bg-[#f4f4f4] px-1 border border-um-border text-black">
            POST /users/batch-delete
          </code>{' '}
          を順に呼び、一覧 API で取得できるステージング行と Cognito ユーザーを一括削除します。デモ用です。
        </p>
      </div>
      <div className="px-5 py-6 max-w-3xl space-y-4">
        <p className="text-sm text-red-800 border border-red-200 bg-red-50 px-3 py-2">
          本番では使用しないでください。ステージングとユーザープールのデータが消えます。
        </p>

        <button
          type="button"
          className="inline-flex justify-center min-w-[200px] px-4 py-2.5 text-sm font-medium text-white bg-red-700 border border-red-800 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={busy}
          onClick={handleInit}
        >
          {busy ? '処理中…' : 'データを初期化'}
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
                  バッチ数: {r.batches} / 成功件数: {r.successItems} / 失敗件数:{' '}
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
    </>
  );
}
