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
 * Authorization / consent UI aligned with Authlete java-oauth-server
 * (`authorization.jsp` + `authorization.css`): layout, typography, colors, controls.
 *
 * @see https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/WEB-INF/template/authorization.jsp
 * @see https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/css/authorization.css
 */
export function AuthorizationConsentPage({
  model,
  decisionPath,
  federationInitiationPathPrefix,
}: AuthorizationConsentPageProps) {
  const { serviceName } = model;

  const pageTitle =
    serviceName != null && serviceName !== '' ? serviceName : 'Authorization';

  return (
    <>
      <AuthorizationPageStyles />
      <div class="au3te-authz font-default">
        <div id="page_title">{pageTitle}</div>

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
    </>
  );
}
