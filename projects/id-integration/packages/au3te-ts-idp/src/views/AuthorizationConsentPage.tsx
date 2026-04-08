import type { AuthorizationPageModel } from '@vecrea/au3te-ts-common/handler.authorization-page';

export type AuthorizationConsentPageProps = {
  model: AuthorizationPageModel;
  /** 例: `/api/authorization/decision`（`AUTHORIZATION_DECISION_PATH`） */
  decisionPath: string;
};

/**
 * Authlete 由来の AuthorizationPageModel を表示する同意画面。
 * POST は `authorization-decision` の `processRequest` / `extractParameters` が想定する
 * `application/x-www-form-urlencoded`（`authorized`, `loginId`, `password`）に合わせている。
 */
export function AuthorizationConsentPage({
  model,
  decisionPath,
}: AuthorizationConsentPageProps) {
  const { serviceName, clientName, description, scopes, user, loginId } = model;
  /** モデルに user がいても、セッション未設定なら ID/パスワードが必要な場合がある */
  const passwordRequired = user == null;

  return (
    <main style={{ maxWidth: '32rem', margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem' }}>アクセスの許可</h1>
      <p style={{ color: '#444' }}>
        <strong>{clientName ?? 'クライアント'}</strong>
        {serviceName != null && serviceName !== '' ? (
          <>
            {' '}
            が <strong>{serviceName}</strong> 上のリソースへアクセスしようとしています。
          </>
        ) : (
          <> がリソースへアクセスしようとしています。</>
        )}
      </p>
      {description != null && description !== '' ? <p style={{ fontSize: '0.9rem' }}>{description}</p> : null}
      {scopes != null && scopes.length > 0 ? (
        <section style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1rem' }}>要求されているスコープ</h2>
          <ul>
            {scopes.map((s, i) => (
              <li key={i}>
                <code>{s.name ?? String(s)}</code>
                {s.description != null && s.description !== '' ? (
                  <span style={{ marginLeft: '0.5rem', color: '#555' }}>{s.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        {user != null ? (
          <p>
            ログイン中: <strong>{user.subject ?? user.loginId ?? '—'}</strong>
          </p>
        ) : loginId != null && loginId !== '' ? (
          <p>
            ログイン ID（初期値）: <code>{loginId}</code>
          </p>
        ) : (
          <p>未ログインの場合は、下記のパスワードを入力してから許可／拒否してください。</p>
        )}
      </section>

      <form
        method="post"
        action={decisionPath}
        encType="application/x-www-form-urlencoded"
        style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span>ログイン ID</span>
          <input
            type="text"
            name="loginId"
            autoComplete="username"
            defaultValue={loginId ?? user?.loginId ?? ''}
            style={{ padding: '0.5rem' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span>パスワード（未ログイン時は必須）</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required={passwordRequired}
            style={{ padding: '0.5rem' }}
          />
        </label>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            name="authorized"
            value="true"
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            許可
          </button>
          <button
            type="submit"
            name="authorized"
            value=""
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            拒否
          </button>
        </div>
      </form>
    </main>
  );
}
