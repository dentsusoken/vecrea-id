import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Demo gate for protected routes: resolves the Better Auth session from request headers.
 * Unauthenticated visitors are redirected to `/sign-in`.
 */
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

/** Limit middleware-style usage to the demo protected page `/page`. */
export const config = {
  matcher: ["/page"],
};
