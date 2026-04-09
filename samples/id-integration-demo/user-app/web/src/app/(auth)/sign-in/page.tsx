"use client";

import { SignInButton } from "@/components/auth/SignInButton";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Keep this screen obviously distinct from the home page in the demo. */}
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600">
            Continue with your identity provider to access protected pages in
            this demo.
          </p>
        </div>

        <div className="flex justify-center">
          <SignInButton />
        </div>
      </div>
    </div>
  );
}
