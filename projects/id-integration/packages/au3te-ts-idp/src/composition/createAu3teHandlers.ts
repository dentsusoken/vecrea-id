import { ServiceJwksHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.service-jwks';
import type { ServerDeps } from './createServerDeps';

export type Au3teHandlers = {
  serviceJwks: ServiceJwksHandlerConfigurationImpl;
};

/** au3te-ts-server の各 HandlerConfigurationImpl をまとめて生成する（現状は JWKS のみ） */
export function createAu3teHandlers(deps: ServerDeps): Au3teHandlers {
  const serviceJwks = new ServiceJwksHandlerConfigurationImpl(
    deps.serverHandler
  );

  return { serviceJwks };
}
