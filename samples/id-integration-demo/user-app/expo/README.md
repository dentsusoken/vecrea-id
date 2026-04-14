## Demo Expo App (Better Auth + Generic OAuth)

Expo / Expo Router port of the sibling [../web](../web) demo: sign-in via [Better Auth](https://better-auth.com/) [Generic OAuth](https://www.better-auth.com/docs/plugins/generic-oauth) (`providerId: "custom"`), with the Better Auth handler mounted on Expo Router **API routes** under `/api/auth/*` (see `app/api/auth/[...auth]+api.ts`).

**Targets: iOS and Android only.** Web UI for this product is expected to stay on the Next.js app under [../web](../web); this project does not include `react-native-web`.

`pnpm` and `tsconfig.json` follow the `web` sample (`packageManager`, path alias `@/*` → `./src/*`, `strict: false`, etc.), extended with `expo/tsconfig.base`.

## Prerequisites

- Node.js (match the rest of this repo)
- pnpm `10.x` (see `package.json` → `packageManager`)

## Setup

```bash
pnpm install --config.confirmModulesPurge=false
```

Create `.env` (or `.env.local`) in this directory. Use the same variable names as `web`; add the public base URL for the native client.


| Variable                        | Purpose                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`               | Public base URL of this app (server + redirects). Example dev: `http://localhost:8081` (Expo dev server; use your LAN IP from a physical device). |
| `BETTER_AUTH_SECRET`            | Server secret for Better Auth (`openssl rand -base64 32`).                                                                                        |
| `CUSTOM_PROVIDER_CLIENT_ID`     | OAuth/OIDC client id at your IdP                                                                                                                  |
| `CUSTOM_PROVIDER_CLIENT_SECRET` | Client secret                                                                                                                                     |
| `CUSTOM_PROVIDER_DISCOVERY_URL` | OpenID configuration URL                                                                                                                          |
| `EXPO_PUBLIC_BETTER_AUTH_URL`   | Same origin as `BETTER_AUTH_URL` for the JS client (required on native when auto-detection is wrong).                                             |


IdP redirect URI (must match `BETTER_AUTH_URL`):

`{BETTER_AUTH_URL}/api/auth/oauth2/callback/custom`

## Run (pnpm only)

```bash
pnpm dev
```

Platform shortcuts:

```bash
pnpm run android
pnpm run ios
```

Typecheck:

```bash
pnpm run typecheck
```

## Notes

- **Scheme**: `id-integration-demo-expo` (see `app.json`). It must stay aligned with `trustedOrigins` in `src/lib/auth.ts` and `scheme` in `src/lib/auth-client.ts`.
- **Physical devices**: point `BETTER_AUTH_URL` and `EXPO_PUBLIC_BETTER_AUTH_URL` at a reachable host (your machine’s LAN IP or a tunnel), not `localhost`, and register that URL with your IdP.

