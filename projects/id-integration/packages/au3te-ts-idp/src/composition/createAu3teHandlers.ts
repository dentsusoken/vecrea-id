import { AuthorizationPageHandlerConfigurationImpl } from '@vecrea/au3te-ts-common/handler.authorization-page';
import type { User } from '@vecrea/au3te-ts-common/schemas.common';
import { ExtractorConfigurationImpl } from '@vecrea/au3te-ts-server/extractor';
import {
  AuthorizationHandlerConfigurationImpl,
} from '@vecrea/au3te-ts-server/handler.authorization';
import { AuthorizationFailHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.authorization-fail';
import { AuthorizationIssueHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.authorization-issue';
import { AuthorizationDecisionHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.authorization-decision';
import {
  AuthorizationServerMetadataHandlerConfigurationImpl,
  OpenIDConfigurationHandlerConfigurationImpl,
} from '@vecrea/au3te-ts-server/handler.service-configuration';
import { ServiceJwksHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.service-jwks';
import { TokenHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token';
import { TokenCreateHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-create';
import { TokenFailHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-fail';
import { TokenIssueHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-issue';
import type { DefaultSessionSchemas } from '@vecrea/au3te-ts-server/session';
import { createStubFederationManager } from './createStubFederationManager';
import type { ServerDeps } from './createServerDeps';

export type Au3teHandlers = {
  serviceJwks: ServiceJwksHandlerConfigurationImpl;
  openIdConfiguration: OpenIDConfigurationHandlerConfigurationImpl;
  authorizationServerMetadata: AuthorizationServerMetadataHandlerConfigurationImpl;
  token: TokenHandlerConfigurationImpl<User>;
  authorization: AuthorizationHandlerConfigurationImpl<DefaultSessionSchemas>;
  authorizationDecision: AuthorizationDecisionHandlerConfigurationImpl<
    DefaultSessionSchemas,
    User,
    never
  >;
};

/** Hono Context に載せる au3te ハンドラー束 */
export type Au3teHonoEnv = {
  Variables: {
    au3teHandlers: Au3teHandlers;
  };
};

/** au3te-ts-server の各 HandlerConfigurationImpl をまとめて生成する */
export function createAu3teHandlers(deps: ServerDeps): Au3teHandlers {
  const { serverHandler, userHandlerConfiguration } = deps;

  const serviceJwks = new ServiceJwksHandlerConfigurationImpl(serverHandler);
  const openIdConfiguration =
    new OpenIDConfigurationHandlerConfigurationImpl(serverHandler);
  const authorizationServerMetadata =
    new AuthorizationServerMetadataHandlerConfigurationImpl(serverHandler);

  const extractorConfiguration = new ExtractorConfigurationImpl();
  const federationManager = createStubFederationManager();

  const authorizationIssueHandlerConfiguration =
    new AuthorizationIssueHandlerConfigurationImpl(serverHandler);
  const authorizationFailHandlerConfiguration =
    new AuthorizationFailHandlerConfigurationImpl(serverHandler);
  const authorizationPageHandlerConfiguration =
    new AuthorizationPageHandlerConfigurationImpl();

  const authorization = new AuthorizationHandlerConfigurationImpl({
    serverHandlerConfiguration: serverHandler,
    authorizationIssueHandlerConfiguration,
    authorizationFailHandlerConfiguration,
    authorizationPageHandlerConfiguration,
    extractorConfiguration,
    federationManager,
  });

  const authorizationDecision =
    new AuthorizationDecisionHandlerConfigurationImpl({
      serverHandlerConfiguration: serverHandler,
      extractorConfiguration,
      userHandlerConfiguration,
      authorizationHandlerConfiguration: authorization,
      authorizationIssueHandlerConfiguration,
      authorizationFailHandlerConfiguration,
    });

  const tokenFailHandlerConfiguration = new TokenFailHandlerConfigurationImpl(
    serverHandler
  );
  const tokenIssueHandlerConfiguration = new TokenIssueHandlerConfigurationImpl(
    serverHandler
  );
  const tokenCreateHandlerConfiguration =
    new TokenCreateHandlerConfigurationImpl(serverHandler);

  const token = new TokenHandlerConfigurationImpl({
    serverHandlerConfiguration: serverHandler,
    userHandlerConfiguration: userHandlerConfiguration,
    tokenFailHandlerConfiguration,
    tokenIssueHandlerConfiguration,
    tokenCreateHandlerConfiguration,
    extractorConfiguration,
  });

  return {
    serviceJwks,
    openIdConfiguration,
    authorizationServerMetadata,
    token,
    authorization,
    authorizationDecision,
  };
}
