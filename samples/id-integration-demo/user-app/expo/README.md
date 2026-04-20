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

### Environment variables

For **distributed builds** (EAS Build / EAS Update), configure variables in the EAS dashboard (recommended).

- Create/update variables in the `preview` environment (Project settings → Environment variables).
- Use the variable names listed below.

For **local development** (`pnpm dev`), you can either:

- use EAS variables locally via `eas env:pull --environment preview`, or
- create `.env.local` in this directory with the same variable names.

| Variable                                    | Purpose                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_BETTER_AUTH_URL`               | Public base URL of this app (server + redirects). Example dev: `http://localhost:8081` (Expo dev server; use your LAN IP from a physical device). |
| `EXPO_PUBLIC_CUSTOM_PROVIDER_CLIENT_ID`     | OAuth/OIDC client id at your IdP                                                                                                                  |
| `EXPO_PUBLIC_CUSTOM_PROVIDER_DISCOVERY_URL` | OpenID configuration URL                                                                                                                          |

Example values:

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8081

# Your IdP settings (Cognito / OIDC)
EXPO_PUBLIC_CUSTOM_PROVIDER_CLIENT_ID=replace-me
EXPO_PUBLIC_CUSTOM_PROVIDER_DISCOVERY_URL=https://example.com/.well-known/openid-configuration
```

IdP redirect URI (must match `EXPO_PUBLIC_BETTER_AUTH_URL`):

`{EXPO_PUBLIC_BETTER_AUTH_URL}/api/auth/oauth2/callback/custom`

## EAS Build (cloud)

- Create an Expo account: https://expo.dev/signup
- Create/configure your first EAS Build project (this will guide you through installing EAS CLI, logging in, and configuring the project): https://docs.expo.dev/build/setup/

After project setup is complete, you can trigger builds with either EAS CLI directly or the `pnpm` shortcuts in this repo:

```bash
# EAS CLI
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas build --platform all --profile preview

# pnpm shortcuts (same as above)
pnpm eas:build:ios
pnpm eas:build:android
pnpm eas:build:all
```

### Install the build (Android / iOS)

After the build finishes, open the build details page in the EAS dashboard and use one of the options below.

> Note: Install links and access requirements can vary by project settings and may expire or require sign-in. If you're not sure which link to use or how long it stays valid, confirm the intended install flow with the app/project owner.

#### Android (device / emulator)

- Click **Install** on the Android build artifact.
- Copy the install link (or use the QR code), open it **inside the Android Emulator**, and complete the install flow on Android.
  - You may need to allow installing apps from an unknown source on the emulator.

#### iOS (Simulator)

This repo builds iOS **Simulator** artifacts (`ios.simulator: true`).

- Download the iOS simulator build on your Mac from the build page (**Download**).
- In the build artifact menu (next to **Download**), use **Run on your simulator** and follow the on-screen instructions to install it.

## EAS Update (OTA)

Publish an over-the-air update to the `preview` channel:

```bash
eas update --channel preview --environment preview

# or via pnpm (same as above)
pnpm eas:update
```

### How updates are applied on devices

- A build will fetch updates only if the **channel** matches (this repo uses `preview`).
- A build will apply updates only if the **runtimeVersion** matches (this repo uses `runtimeVersion.policy = "appVersion"`).
- By default, `expo-updates` checks for updates on launch. If the download finishes quickly enough it may apply on the same launch, otherwise it will apply on the next launch.

## Local development

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

## iOS / Android: end-to-end runbook (local dev)

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

