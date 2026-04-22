import { createServerRunner, type NextServer } from '@aws-amplify/adapter-nextjs';
import { getAmplifyResourcesConfig } from './amplify-config';

let runner: NextServer.CreateServerRunnerOutput | null = null;

function getRunner(): NextServer.CreateServerRunnerOutput {
  if (!runner) {
    runner = createServerRunner({ config: getAmplifyResourcesConfig() });
  }
  return runner;
}

export function runWithAmplifyServerContext(
  input: Parameters<NextServer.RunOperationWithContext>[0],
): ReturnType<NextServer.RunOperationWithContext> {
  return getRunner().runWithAmplifyServerContext(input);
}

export function createAuthRouteHandlers(
  ...args: Parameters<NextServer.CreateServerRunnerOutput['createAuthRouteHandlers']>
): ReturnType<NextServer.CreateServerRunnerOutput['createAuthRouteHandlers']> {
  return getRunner().createAuthRouteHandlers(...args);
}
