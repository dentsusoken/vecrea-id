'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { CredentialOffer, CreditInfoList } from '@/lib/domain';

type GetCreditsResponse = {
  credits: CreditInfoList;
};

const CREDENTIAL_CONFIGURATION_ID = 'eu.europa.ec.eudi.pid_vc_sd_jwt';

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

  const handleCreateOffer = async (id: string) => {
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

  return (
    <div className="min-h-screen bg-zinc-50 p-8 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">University Credits</h1>

        {loading && <p>Loading credits...</p>}
        {errorMessage && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && (
          <div className="overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Credit ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expire At</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {creditItems.map(({ id, credit }) => {
                  const isCreatingOffer = creatingOfferId === id;
                  return (
                    <tr key={id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-4 py-3">{credit.credit_id}</td>
                      <td className="px-4 py-3">{credit.name}</td>
                      <td className="px-4 py-3">{credit.status}</td>
                      <td className="px-4 py-3">{credit.expire_at}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded bg-blue-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
                          onClick={() => void handleCreateOffer(id)}
                          disabled={isCreatingOffer}
                        >
                          {isCreatingOffer ? 'Creating offer...' : 'Credential offer'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {offerModal && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOfferModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded bg-white p-6 text-zinc-900 shadow-lg"
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
            <h2 className="mb-4 text-lg font-semibold">Credential Offer QR</h2>
            <Image
              src={`data:image/png;base64,${offerModal.base64_img}`}
              alt="Credential offer QR code"
              className="mx-auto mb-5 h-64 w-64"
              width={256}
              height={256}
              unoptimized
            />
            <div className="flex items-center justify-center">
              <a
                href={offerModal.uri}
                className="inline-flex min-w-40 items-center justify-center rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
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
