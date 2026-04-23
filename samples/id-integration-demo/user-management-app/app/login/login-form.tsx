'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmSignIn, fetchAuthSession, signIn } from 'aws-amplify/auth';

function LoginInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const urlError = searchParams.get('error');
  const urlErrorDescription = searchParams.get('error_description');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { nextStep } = await signIn({
        username: email.trim(),
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'EMAIL_OTP',
        },
      });

      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
        setStep('otp');
      } else {
        setError(`Unexpected step: ${nextStep.signInStep}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { nextStep } = await confirmSignIn({
        challengeResponse: code.trim(),
      });
      if (nextStep.signInStep === 'DONE') {
        await fetchAuthSession().catch(() => undefined);
        const redirect = searchParams.get('redirect') ?? '/users';
        window.location.assign(redirect);
        return;
      } else {
        setError(`Unexpected step: ${nextStep.signInStep}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code verification failed');
    } finally {
      setPending(false);
    }
  }

  const displayError =
    error ??
    (urlError
      ? urlErrorDescription
        ? decodeURIComponent(urlErrorDescription.replace(/\+/g, ' '))
        : urlError
      : null);

  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border border-um-border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-um-text">Sign in</h1>
      <p className="mt-2 text-sm text-um-text/80">
        Email one-time code (Cognito USER_AUTH / EMAIL_OTP). Pool must allow
        choice-based sign-in and ALLOW_USER_AUTH on the app client.
      </p>

      {displayError ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {displayError}
        </p>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-um-text">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="rounded-md border border-um-border px-3 py-2 text-base text-um-text outline-none focus:ring-2 focus:ring-um-titlebar/40"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-um-titlebar px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmCode} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-um-text/80">
            Enter the code sent to{' '}
            <span className="font-medium text-um-text">{email}</span>.
          </p>
          <label className="flex flex-col gap-1 text-sm font-medium text-um-text">
            One-time code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              className="rounded-md border border-um-border px-3 py-2 text-base text-um-text outline-none focus:ring-2 focus:ring-um-titlebar/40"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-um-titlebar px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Verifying…' : 'Sign in'}
          </button>
          <button
            type="button"
            className="text-sm text-um-text/80 underline"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={<div className="text-sm text-um-text/80">Loading…</div>}
    >
      <LoginInner />
    </Suspense>
  );
}
