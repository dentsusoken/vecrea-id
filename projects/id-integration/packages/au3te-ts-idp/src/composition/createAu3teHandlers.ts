import type { User } from '@vecrea/au3te-ts-common/schemas.common';
import { ExtractorConfigurationImpl } from '@vecrea/au3te-ts-server/extractor';
import { TokenHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token';
import { TokenCreateHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-create';
import { TokenFailHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-fail';
import { TokenIssueHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.token-issue';
import { ServiceJwksHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.service-jwks';
import type { ServerDeps } from './createServerDeps';

export type Au3teHandlers = {
  serviceJwks: ServiceJwksHandlerConfigurationImpl;
  token: TokenHandlerConfigurationImpl<User>;
};

/** au3te-ts-server の各 HandlerConfigurationImpl をまとめて生成する */
export function createAu3teHandlers(deps: ServerDeps): Au3teHandlers {
  const { serverHandler, userHandlerConfiguration } = deps;

  const serviceJwks = new ServiceJwksHandlerConfigurationImpl(serverHandler);

  const extractorConfiguration = new ExtractorConfigurationImpl();
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

  return { serviceJwks, token };
}
