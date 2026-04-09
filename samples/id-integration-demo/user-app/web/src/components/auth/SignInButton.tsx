"use client";

import { CustomSignInButton } from "./CustomSignInButton";

/** Thin wrapper so pages import a single `SignInButton` entry point. */
export function SignInButton() {
  return <CustomSignInButton />;
}
