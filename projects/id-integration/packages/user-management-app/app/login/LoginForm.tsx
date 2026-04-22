'use client';

import { ensureAmplifyConfiguredOnClient } from '@/lib/amplify-client';
import { confirmSignIn, signIn } from 'aws-amplify/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

type Step = 'email' | 'otp';

export function LoginForm() {
  const router = useRouter();
  useLayoutEffect(() => {
    ensureAmplifyConfiguredOnClient();
  }, []);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      ensureAmplifyConfiguredOnClient();
      const trimmed = email.trim();
      const { isSignedIn, nextStep } = await signIn({
        username: trimmed,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'EMAIL_OTP',
        },
      });

      if (isSignedIn) {
        router.push('/users');
        router.refresh();
        return;
      }

      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
        setDestination(nextStep.codeDeliveryDetails?.destination);
        setStep('otp');
        return;
      }

      if (nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
        const available = nextStep.availableChallenges ?? [];
        if (!available.includes('EMAIL_OTP')) {
          setError(
            available.length
              ? `このアカウントでは利用できるサインイン方法: ${available.join(', ')}`
              : 'メール OTP でサインインできません。ユーザープールの設定を確認してください。',
          );
          return;
        }
        const second = await confirmSignIn({ challengeResponse: 'EMAIL_OTP' });
        if (second.isSignedIn) {
          router.push('/users');
          router.refresh();
          return;
        }
        if (second.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
          setDestination(second.nextStep.codeDeliveryDetails?.destination);
          setStep('otp');
          return;
        }
        setError('追加のサインイン手順が必要です。管理者に問い合わせてください。');
        return;
      }

      setError(`未対応のサインイン状態です: ${nextStep.signInStep}`);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      const message = err instanceof Error ? err.message : String(err);
      setError(
        name === 'UserNotFoundException'
          ? 'このメールアドレスは登録されていません。'
          : name === 'NotAuthorizedException'
            ? 'サインインを完了できません。メールの確認やユーザープール設定を確認してください。'
            : message || 'サインインに失敗しました。',
      );
    } finally {
      setPending(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      ensureAmplifyConfiguredOnClient();
      const { isSignedIn, nextStep } = await confirmSignIn({
        challengeResponse: code.trim(),
      });
      if (isSignedIn) {
        router.push('/users');
        router.refresh();
        return;
      }
      setError(`コード確認後もサインインが完了しませんでした: ${nextStep.signInStep}`);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      const message = err instanceof Error ? err.message : String(err);
      setError(
        name === 'CodeMismatchException'
          ? 'コードが正しくありません。'
          : name === 'ExpiredCodeException'
            ? 'コードの有効期限が切れています。最初からやり直してください。'
            : message || '確認に失敗しました。',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-um-heading mb-2">Sign in</h1>
      <p className="text-sm text-um-text mb-6">
        登録済みのメールアドレスにワンタイムコードを送ります。
      </p>

      {error ? (
        <p
          className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-um-text">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="border border-um-border rounded px-3 py-2 text-um-text"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-um-primary hover:bg-um-primary-hover text-white font-medium py-2 px-4 rounded disabled:opacity-60"
          >
            {pending ? '送信中…' : 'コードを送信'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          {destination ? (
            <p className="text-sm text-um-text">
              コードを送信しました: <strong>{destination}</strong>
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-um-text">ワンタイムコード</span>
            <input
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              className="border border-um-border rounded px-3 py-2 text-um-text tracking-widest"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-um-primary hover:bg-um-primary-hover text-white font-medium py-2 px-4 rounded disabled:opacity-60"
          >
            {pending ? '確認中…' : 'サインイン'}
          </button>
          <button
            type="button"
            className="text-sm text-um-link underline"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            メールアドレスをやり直す
          </button>
        </form>
      )}

      <p className="mt-8 text-sm">
        <Link href="/users" className="text-um-link underline">
          ← アプリへ
        </Link>
        <span className="text-um-text">（未ログインの場合は保護ページからリダイレクトされます）</span>
      </p>
    </div>
  );
}
