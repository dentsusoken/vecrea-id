## Demo Expo App (Better Auth + Generic OAuth)

This is the Expo / Expo Router demo app for **Better Auth + Generic OAuth** (`providerId: "custom"`).

### Architecture

- **Client**: Expo app (iOS / Android / Web via `expo start --web`)
- **Auth**: Better Auth client (`better-auth/react`) + Expo plugin (`@better-auth/expo/client`)
- **Server**: Better Auth handler is mounted as Expo Router **API Routes** under `app/api/auth/[...auth]+api.ts` (served at `/api/auth/`* during dev)
- **IdP**: Any OIDC provider (example: Cognito Hosted UI), configured via env vars (see below)

TypeScript + `pnpm` configuration follows the sibling [../web](../web) sample (package manager, path alias `@/`* → `./src/`*, etc.), extended with `expo/tsconfig.base`.

## Prerequisites

- Node.js (match the rest of this repo)
- pnpm `10.x` (see `package.json` → `packageManager`)
- (Android, optional) `adb` (Android Platform Tools)

## Setup

```bash
pnpm install --config.confirmModulesPurge=false
```

Create `.env` (or `.env.local`) in this directory.

- Use the same variable names as `web`
- Add the public base URL for the native client (`EXPO_PUBLIC_BETTER_AUTH_URL`)

### Environment variables


| Variable                        | Purpose                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`               | Public base URL of this app (server + redirects). Example dev: `http://localhost:8081` (Expo dev server; use your LAN IP from a physical device). |
| `BETTER_AUTH_SECRET`            | Server secret for Better Auth (`openssl rand -base64 32`).                                                                                        |
| `CUSTOM_PROVIDER_CLIENT_ID`     | OAuth/OIDC client id at your IdP                                                                                                                  |
| `CUSTOM_PROVIDER_DISCOVERY_URL` | OpenID configuration URL                                                                                                                          |
| `EXPO_PUBLIC_BETTER_AUTH_URL`   | Same origin as `BETTER_AUTH_URL` for the JS client (required on native when auto-detection is wrong).                                             |


Example `.env.local`:

```bash
BETTER_AUTH_URL=http://localhost:8081
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8081

# Server-only secret
BETTER_AUTH_SECRET=replace-me

# Your IdP settings (Cognito / OIDC)
CUSTOM_PROVIDER_CLIENT_ID=replace-me
CUSTOM_PROVIDER_DISCOVERY_URL=https://example.com/.well-known/openid-configuration
```

IdP redirect URI (must match `BETTER_AUTH_URL`):

`{BETTER_AUTH_URL}/api/auth/oauth2/callback/custom`

## Run (pnpm only)

```bash
pnpm dev
```

Then you can use the Expo CLI shortcuts in the terminal:

- Press `a` to launch Android (requires a running Android emulator)
- Press `i` to launch iOS (Simulator)
- Press `w` to launch Web

OR use platform shortcuts:

```bash
pnpm run android
pnpm run ios
pnpm run web
```

Typecheck:

```bash
pnpm run typecheck
```

## Android (Emulator): accessing `localhost`

This app (including the Better Auth handler on API routes) runs on the Expo dev server port (default: `8081`). If the Android emulator cannot reach your machine at `http://localhost:8081`, the OAuth callback + cookie handoff will fail.

### Install `adb` (Android Platform Tools)

macOS (Homebrew):

```bash
brew install android-platform-tools
```

Verify:

```bash
adb version
adb devices
```

### Required: use `adb reverse`

The Android emulator must be able to reach the dev server at `http://localhost:8081`. Make sure the emulator is running, then run:

```bash
adb reverse tcp:8081 tcp:8081
```

## iOS / Android: end-to-end runbook

### iOS (Simulator)

```bash
pnpm ios
```

Then in the iOS Simulator:

- Open the app
- Tap **Sign in**
- Complete the IdP flow in the browser sheet

### Android (Emulator)

Note: `pnpm android` requires a running Android emulator.

```bash
pnpm android
```

## Notes

- **Scheme**: `id-integration-demo-expo` (see `app.json`). It must stay aligned with `trustedOrigins` in `src/lib/auth.ts` and `scheme` in `src/lib/auth-client.ts`.

