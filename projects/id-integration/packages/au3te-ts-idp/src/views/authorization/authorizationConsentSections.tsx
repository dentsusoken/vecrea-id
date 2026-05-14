import type { AuthorizationPageModel } from '@vecrea/au3te-ts-common/handler.authorization-page';

export type FederationLinkItem = {
  id: string;
  label: string;
};

function federationListFromModel(
  model: AuthorizationPageModel
): FederationLinkItem[] {
  const list = model.federationRegistry?.federations;
  if (!list?.length) {
    return [];
  }
  return list.flatMap((f) => {
    if (
      f == null ||
      typeof f !== 'object' ||
      !('id' in f) ||
      typeof f.id !== 'string' ||
      f.id.length === 0
    ) {
      return [];
    }
    const id = f.id;
    let label = id;
    if (
      'protocol' in f &&
      f.protocol === 'oidc' &&
      'server' in f &&
      f.server &&
      typeof f.server === 'object' &&
      'name' in f.server
    ) {
      label = String((f.server as { name?: string }).name ?? id);
    } else if ('protocol' in f && f.protocol === 'saml2' && 'name' in f) {
      label = String((f as { name?: string }).name ?? id);
    }
    return [{ id, label }];
  });
}

export function ClientSummarySection({ model }: { model: AuthorizationPageModel }) {
  const {
    clientName,
    description,
    logoUri,
    clientUri,
    policyUri,
    tosUri,
  } = model;

  const hasClientLinks =
    (clientUri != null && clientUri !== '') ||
    (policyUri != null && policyUri !== '') ||
    (tosUri != null && tosUri !== '');

  return (
    <>
      <h3 id="client-name">{clientName ?? 'Client'}</h3>
      <div class="indent">
        {logoUri != null && logoUri !== '' ? (
          <img
            id="logo"
            src={logoUri}
            alt="[Logo] (150x150)"
            width={150}
            height={150}
          />
        ) : null}
        <div id="client-summary">
          {description != null && description !== '' ? <p>{description}</p> : null}
          {hasClientLinks ? (
            <ul id="client-link-list">
              {clientUri != null && clientUri !== '' ? (
                <li>
                  <a target="_blank" href={clientUri} rel="noreferrer noopener">
                    Homepage
                  </a>
                </li>
              ) : null}
              {policyUri != null && policyUri !== '' ? (
                <li>
                  <a target="_blank" href={policyUri} rel="noreferrer noopener">
                    Policy
                  </a>
                </li>
              ) : null}
              {tosUri != null && tosUri !== '' ? (
                <li>
                  <a target="_blank" href={tosUri} rel="noreferrer noopener">
                    Terms of Service
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div class="au3te-clear" />
      </div>
    </>
  );
}

export function PermissionsSection({ model }: { model: AuthorizationPageModel }) {
  const { scopes } = model;
  if (scopes == null || scopes.length === 0) {
    return null;
  }
  return (
    <>
      <h4 id="permissions">Permissions</h4>
      <div class="indent">
        <p>The application is requesting the following permissions.</p>
        <dl id="scope-list">
          {scopes.flatMap((scope, i) => [
            <dt key={`s-${i}-n`}>{scope.name ?? `scope-${i}`}</dt>,
            <dd key={`s-${i}-d`}>
              {scope.description != null && scope.description !== ''
                ? scope.description
                : '\u00a0'}
            </dd>,
          ])}
        </dl>
      </div>
    </>
  );
}

export function ClaimsSections({ model }: { model: AuthorizationPageModel }) {
  const idClaims = model.claimsForIdToken;
  const uiClaims = model.claimsForUserInfo;
  return (
    <>
      {idClaims != null && idClaims.length > 0 ? (
        <>
          <h4 id="claims-for-id_token">Claims for ID Token</h4>
          <div class="indent">
            <ul>
              {idClaims.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      {uiClaims != null && uiClaims.length > 0 ? (
        <>
          <h4 id="claims-for-userinfo">Claims for UserInfo</h4>
          <div class="indent">
            <ul>
              {uiClaims.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </>
  );
}

export function IdentityAssuranceSection({ model }: { model: AuthorizationPageModel }) {
  if (!model.identityAssuranceRequired) {
    return null;
  }

  const {
    purpose,
    allVerifiedClaimsForIdTokenRequested,
    verifiedClaimsForIdToken,
    allVerifiedClaimsForUserInfoRequested,
    verifiedClaimsForUserInfo,
  } = model;

  return (
    <>
      <h4 id="identity-assurance">Identity Assurance</h4>
      <div class="indent">
        {purpose != null && purpose !== '' ? (
          <>
            <h5>Purpose</h5>
            <div class="indent">
              <p>{purpose}</p>
            </div>
          </>
        ) : null}

        {(allVerifiedClaimsForIdTokenRequested === true ||
          (verifiedClaimsForIdToken != null && verifiedClaimsForIdToken.length > 0)) ? (
          <>
            <h5>Verified claims requested for ID token</h5>
            <div class="indent">
              {allVerifiedClaimsForIdTokenRequested === true ? <p>All</p> : null}
              {verifiedClaimsForIdToken != null && verifiedClaimsForIdToken.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table class="verified-claims" border={1} cellPadding={5}>
                    <thead>
                      <tr>
                        <th>claim</th>
                        <th>purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedClaimsForIdToken.map((pair, i) => (
                        <tr key={i}>
                          <td>{pair.key ?? ''}</td>
                          <td>{pair.value ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {(allVerifiedClaimsForUserInfoRequested === true ||
          (verifiedClaimsForUserInfo != null && verifiedClaimsForUserInfo.length > 0)) ? (
          <>
            <h5>Verified claims requested for userinfo</h5>
            <div class="indent">
              {allVerifiedClaimsForUserInfoRequested === true ? <p>All</p> : null}
              {verifiedClaimsForUserInfo != null && verifiedClaimsForUserInfo.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table class="verified-claims" border={1} cellPadding={5}>
                    <thead>
                      <tr>
                        <th>claim</th>
                        <th>purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedClaimsForUserInfo.map((pair, i) => (
                        <tr key={i}>
                          <td>{pair.key ?? ''}</td>
                          <td>{pair.value ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

export function AuthorizationDetailsSection({ model }: { model: AuthorizationPageModel }) {
  const details = model.authorizationDetails;
  if (details == null || details === '') {
    return null;
  }
  return (
    <>
      <h4 id="authorization-details">Authorization Details</h4>
      <div class="indent">
        <pre class="au3te-authz-details">{details}</pre>
      </div>
    </>
  );
}

export type AuthorizationFormProps = {
  model: AuthorizationPageModel;
  decisionPath: string;
  federationInitiationPathPrefix: string;
};

export function AuthorizationDecisionForm({
  model,
  decisionPath,
  federationInitiationPathPrefix,
}: AuthorizationFormProps) {
  const { user, loginId, loginIdReadOnly } = model;
  const federations = federationListFromModel(model);
  const showLoginFields = user == null;
  const loginReadOnly = loginIdReadOnly === 'readonly';

  return (
    <>
      <h4 id="authorization">Authorization</h4>
      <div class="indent">
        <p>Do you grant authorization to the application?</p>

        <form
          id="authorization-form"
          method="post"
          action={decisionPath}
          encType="application/x-www-form-urlencoded"
        >
          {showLoginFields ? (
            <>
              <div id="login-fields" class="indent">
                <div id="login-prompt">Input Login ID and Password.</div>
                <input
                  type="text"
                  id="loginId"
                  name="loginId"
                  placeholder="Login ID"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck={false}
                  defaultValue={loginId ?? ''}
                  readonly={loginReadOnly}
                />
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Password"
                  required={user == null}
                />
              </div>

              {federations.length > 0 ? (
                <div id="federations" class="indent">
                  <div id="federations-prompt">
                    ID federation using an external OpenID Provider
                  </div>
                  <ul>
                    {federations.map((f) => (
                      <li key={f.id}>
                        <a href={`${federationInitiationPathPrefix}/${f.id}`}>
                          {f.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div id="login-user" class="indent">
              Logged in as <b>{user.subject ?? user.loginId ?? '—'}</b>.
              <p class="au3te-reauth-hint">
                If re-authentication is needed, append <code>&amp;prompt=login</code>{' '}
                to the authorization request.
              </p>
            </div>
          )}

          <div id="authorization-form-buttons">
            <input
              type="submit"
              name="authorized"
              id="authorize-button"
              value="Authorize"
              class="font-default"
            />
            <input
              type="submit"
              name="denied"
              id="deny-button"
              value="Deny"
              class="font-default"
            />
          </div>
        </form>
      </div>
    </>
  );
}
