import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  // Gate protected routes by checking the Better Auth session server-side.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Keep the sign-in UX predictable: unauthenticated users always land on /sign-in.
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply this middleware only to the protected demo page.
  matcher: ["/page"],
};
