## Demo Expo App (Better Auth + Generic OAuth)

This is the Expo / Expo Router demo app for **Better Auth + Generic OAuth** (`providerId: "custom"`).

### Architecture

- **Client**: Expo app (iOS / Android / Web via `expo start --web`)
- **Auth**: Better Auth client (`better-auth/react`) + Expo plugin (`@better-auth/expo/client`)
- **Server**: Better Auth API is hosted by the sibling web app at [../web](../web) (NOT by Expo Router API routes)
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
| `EXPO_PUBLIC_BETTER_AUTH_URL`               | Base URL of the Better Auth server (the sibling web app). Example dev: `http://localhost:3000`                                                     |
| `EXPO_PUBLIC_CUSTOM_PROVIDER_CLIENT_ID`     | OAuth/OIDC client id at your IdP                                                                                                                  |
| `EXPO_PUBLIC_CUSTOM_PROVIDER_DISCOVERY_URL` | OpenID configuration URL                                                                                                                          |

Example values:

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Your IdP settings (Cognito / OIDC)
EXPO_PUBLIC_CUSTOM_PROVIDER_CLIENT_ID=replace-me
EXPO_PUBLIC_CUSTOM_PROVIDER_DISCOVERY_URL=https://example.com/.well-known/openid-configuration
```

IdP redirect URI (must match the Better Auth server base URL, i.e. `EXPO_PUBLIC_BETTER_AUTH_URL`):

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

`pnpm dev` starts the Expo dev server. Since the authentication UI + Better Auth API live in the sibling web app, you must also run the web app during local development.

In another terminal (from the sibling web project), start the web app as well:

```bash
cd ../web
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

Better Auth is hosted by the sibling web app (see [../web](../web)).

If you point `EXPO_PUBLIC_BETTER_AUTH_URL` to `http://localhost:3000` on Android, remember that the Android emulator cannot reach your Mac at `localhost`. Use `adb reverse` to forward port `3000` to your Mac.

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

### Required: use `adb reverse` (port 3000)

The Android emulator must be able to reach the web app / Better Auth server. Make sure the emulator is running, then run:

```bash
adb reverse tcp:3000 tcp:3000
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

