import type { NextRequest } from "next/server";
import { createAuthRouteHandlers } from "@/lib/amplify-server";

const handleAuth = createAuthRouteHandlers({
  redirectOnSignInComplete: "/",
  redirectOnSignOutComplete: "/login",
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  return handleAuth(request, { params: context.params });
}