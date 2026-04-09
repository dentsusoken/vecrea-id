## Demo Web App (Better Auth + Generic OAuth)

This is a Next.js demo app that signs users in through [Better Auth](https://better-auth.com/)’s [Generic OAuth plugin](https://www.better-auth.com/docs/plugins/generic-oauth) (`signIn.oauth2`) with a single configured provider id: **`custom`**.

The IdP can be any **OIDC-capable** provider (discovery URL + client credentials). Amazon Cognito is a common choice but is not wired as Better Auth’s built-in `cognito` social provider in this demo.

## What you can try

- Sign in via **OIDC discovery** (`providerId: "custom"`)
- Session-aware UI (header changes based on `useSession`)
- Better Auth API under `/api/auth/*`

## Prerequisites

- Node.js (match the version you use in this repo)
- pnpm (`pnpm@10.x`; see `package.json`)

## Setup

```bash
pnpm install
```

Create `.env.local` (or `.env`) and set the variables below.

## Run (local)

```bash
pnpm dev
```

Open **https://localhost:3000** (dev uses `next dev --experimental-https`; you may need to accept a self-signed certificate warning).

## Environment variables (minimal)

### Better Auth

| Variable | Purpose |
| -------- | ------- |
| `BETTER_AUTH_URL` | Public base URL of this app (client + redirects). Example: `https://localhost:3000` |
| `BETTER_AUTH_SECRET` | Server secret for Better Auth (generate a strong value for non-demo use) |

### Generic OAuth `custom` (required for sign-in)

Configured in `src/lib/providers/custom-provider.ts` and used by **Sign in** (`signIn.oauth2`).

| Variable | Purpose |
| -------- | ------- |
| `CUSTOM_PROVIDER_CLIENT_ID` | OAuth/OIDC client id at your IdP |
| `CUSTOM_PROVIDER_CLIENT_SECRET` | Client secret |
| `CUSTOM_PROVIDER_DISCOVERY_URL` | Full URL to OpenID Configuration (e.g. `…/.well-known/openid-configuration`) |

**Example (AWS Cognito as the IdP)** — issuer-style discovery URL:

`https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/openid-configuration`

See [Cognito federation endpoints](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html).

#### IdP callback URL (important)

Register this **exact** redirect URI on your OAuth/OIDC client (must match `BETTER_AUTH_URL` and path):

`{BETTER_AUTH_URL}/api/auth/oauth2/callback/custom`

Example (local): `https://localhost:3000/api/auth/oauth2/callback/custom`

Mismatch causes `redirect_uri` errors from the IdP.

#### Notes on `name` vs `email`

Better Auth’s Generic OAuth handler requires a non-empty **`name`** after mapping. This demo derives a display name from `name`, then `preferred_username`, then `email`, then `sub` (see `mapOidcStyleProfileToUser` in `custom-provider.ts`). **`email` is still required** by the plugin when linking/creating the user.

## Routes

| Path | Description |
| ---- | ----------- |
| `/` | Demo home (public) |
| `/sign-in` | Sign-in page |
| `/page` | Post–sign-in landing page in this demo |

## How authentication is wired

| Piece | Location |
| ----- | -------- |
| Better Auth server | `src/lib/auth.ts` (`plugins` → `customProvider` only) |
| Generic OAuth `custom` | `src/lib/providers/custom-provider.ts` |
| Route handlers | `src/app/api/auth/[...all]/route.ts` → `/api/auth/*` |
| Client | `src/lib/auth-client.ts` (`createAuthClient` + `genericOAuthClient` for `signIn.oauth2`) |
| UI | `src/components/auth/SignInButton.tsx` → `CustomSignInButton.tsx` |

## Protected route gating (demo)

`src/proxy.ts` contains a session check for `"/page"`. To enforce it in production, connect it from Next.js [middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) as needed.

## Tooling

- Package manager: pnpm
- Styling: Tailwind CSS utility classes
