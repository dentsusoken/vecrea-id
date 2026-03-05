'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { CredentialOffer, CreditInfo, CreditInfoList } from '@/lib/domain';

type GetCreditsResponse = {
  credits: CreditInfoList;
};

const CREDENTIAL_CONFIGURATION_ID = 'jp.ac.nii.academic_credit';

export default function Home() {
  const [credits, setCredits] = useState<CreditInfoList>({});
  const [loading, setLoading] = useState(true);
  const [creatingOfferId, setCreatingOfferId] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<CredentialOffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const creditItems = useMemo(
    () => Object.entries(credits).map(([id, credit]) => ({ id, credit })),
    [credits]
  );

  useEffect(() => {
    const fetchCredits = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/get-credits');
        if (!res.ok) {
          throw new Error(`Failed to fetch credits: ${res.status}`);
        }
        const data = (await res.json()) as GetCreditsResponse;
        setCredits(data.credits);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch credits';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchCredits();
  }, []);

  const handleCreateOffer = async (id: string, credit: CreditInfo) => {
    setCreatingOfferId(id);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/credential-offer', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          credential_configuration_id: CREDENTIAL_CONFIGURATION_ID,
          credit_id: credit.credit_id,
        }),
      });
      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string };
        throw new Error(errorBody.message ?? 'Failed to create credential offer');
      }
      const offer = (await res.json()) as CredentialOffer;
      setOfferModal(offer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create credential offer';
      setErrorMessage(message);
    } finally {
      setCreatingOfferId(null);
    }
  };

  const getGradeClasses = (grade: string) => {
    if (grade === 'A') {
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    }
    if (grade === 'B') {
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    }
    return 'bg-zinc-100 text-zinc-700 ring-zinc-500/20';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-50 to-white px-4 py-6 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100 sm:px-6 sm:py-10">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Verifiable Credentials
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                University Credits
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Select a credit and issue a Credential Offer for wallet import.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {loading ? 'Loading credits...' : `${creditItems.length} credits available`}
            </div>
          </div>
        </header>

        {errorMessage && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        )}

        {!loading && !errorMessage && (
          <>
            <ul className="grid gap-3 md:hidden">
              {creditItems.map(({ id, credit }) => {
                const isCreatingOffer = creatingOfferId === id;
                return (
                  <li
                    key={id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Credit ID</p>
                        <p className="mt-0.5 font-medium">{credit.credit_id}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getGradeClasses(credit.grade)}`}
                      >
                        {credit.grade}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">Course Name</dt>
                        <dd className="font-medium">{credit.course_name}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">Academic Term</dt>
                        <dd>{credit.academic_term}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                      onClick={() => void handleCreateOffer(id, credit)}
                      disabled={isCreatingOffer}
                    >
                      {isCreatingOffer ? 'Creating offer...' : 'Create Credential Offer'}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-zinc-100/90 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 font-medium">Credit ID</th>
                    <th className="px-4 py-3 font-medium">Course Name</th>
                    <th className="px-4 py-3 font-medium">Academic Term</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {creditItems.map(({ id, credit }) => {
                    const isCreatingOffer = creatingOfferId === id;
                    return (
                      <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-4 py-3 font-medium">{credit.credit_id}</td>
                        <td className="px-4 py-3">{credit.course_name}</td>
                        <td className="px-4 py-3">
                          {credit.academic_term}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getGradeClasses(credit.grade)}`}
                          >
                            {credit.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                            onClick={() => void handleCreateOffer(id, credit)}
                            disabled={isCreatingOffer}
                          >
                            {isCreatingOffer ? 'Creating offer...' : 'Create Offer'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {offerModal && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
          onClick={() => setOfferModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 text-zinc-900 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close modal"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={() => setOfferModal(null)}
            >
              ×
            </button>
            <h2 className="mb-1 text-lg font-semibold">Credential Offer QR</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Scan this code or open directly in your wallet app.
            </p>
            <Image
              src={`data:image/png;base64,${offerModal.base64_img}`}
              alt="Credential offer QR code"
              className="mx-auto mb-5 h-56 w-56 sm:h-64 sm:w-64"
              width={256}
              height={256}
              unoptimized
            />
            <p className="mb-4 break-all rounded-lg bg-zinc-100 p-2.5 text-xs text-zinc-600">
              {offerModal.uri}
            </p>
            <div className="flex items-center justify-center">
              <a
                href={offerModal.uri}
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Open Wallet
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
