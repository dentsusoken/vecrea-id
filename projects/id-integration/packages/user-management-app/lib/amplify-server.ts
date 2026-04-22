import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { getAmplifyAuthConfig } from "@/lib/amplify-config";

const { runWithAmplifyServerContext, createAuthRouteHandlers } = createServerRunner(
  {
    config: getAmplifyAuthConfig(),
  },
);

export { runWithAmplifyServerContext, createAuthRouteHandlers };