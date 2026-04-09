import type { AuthorizationPageModel } from '@vecrea/au3te-ts-common/handler.authorization-page';
import {
  AuthorizationDecisionForm,
  AuthorizationDetailsSection,
  ClaimsSections,
  ClientSummarySection,
  IdentityAssuranceSection,
  PermissionsSection,
} from './authorizationConsentSections';
import { AuthorizationPageStyles } from './authorizationPageStyles';

export type AuthorizationConsentPageProps = {
  model: AuthorizationPageModel;
  /** 例: `AUTHORIZATION_DECISION_PATH` */
  decisionPath: string;
  /** 例: `/api/federation/initiation`（`:federationId` より前） */
  federationInitiationPathPrefix: string;
};

/**
 * Authlete java-oauth-server の authorization.jsp に相当する同意画面。
 *
 * @see https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/WEB-INF/template/authorization.jsp
 */
export function AuthorizationConsentPage({
  model,
  decisionPath,
  federationInitiationPathPrefix,
}: AuthorizationConsentPageProps) {
  const { serviceName } = model;

  return (
    <>
      <AuthorizationPageStyles />
      <div class="au3te-authz font-default">
        <div class="au3te-authz__inner">
          <div id="page_title">
            {serviceName != null && serviceName !== ''
              ? `${serviceName} | 認可`
              : '認可'}
          </div>

          <div id="content">
            <ClientSummarySection model={model} />
            <PermissionsSection model={model} />
            <ClaimsSections model={model} />
            <IdentityAssuranceSection model={model} />
            <AuthorizationDetailsSection model={model} />
            <AuthorizationDecisionForm
              model={model}
              decisionPath={decisionPath}
              federationInitiationPathPrefix={federationInitiationPathPrefix}
            />
          </div>
        </div>
      </div>
    </>
  );
}
