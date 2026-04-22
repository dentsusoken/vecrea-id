import type { NextRequest } from "next/server";
import { createAuthRouteHandlers } from "@/lib/amplify-server";

let handleAuth: ReturnType<typeof createAuthRouteHandlers> | null = null;

function getHandleAuth() {
  if (!handleAuth) {
    handleAuth = createAuthRouteHandlers({
      redirectOnSignInComplete: "/",
      redirectOnSignOutComplete: "/login",
    });
  }
  return handleAuth;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  return getHandleAuth()(request, { params: context.params });
}