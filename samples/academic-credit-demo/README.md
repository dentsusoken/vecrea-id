# univ-credit-demo

A web application that runs OID4VCI credential offers. This demo kicks off the flow to issue Verifiable Credentials (VCs) for academic credits earned by students.

---

## Quick start

```bash
# 1. Navigate to the demo directory
cd samples/univ-credit-demo

# 2. One-time setup (run from repository root)
bash ./scripts/setup_local.sh

# 3. Start Issuer Docker services
bash ./scripts/start_local_issuer.sh

# 4. Start the Next.js app (in a separate terminal)
pnpm install && pnpm dev
```

Open http://localhost:3000 in your browser.

---

## Overview

- A **OID4VCI** (OpenID for Verifiable Credential Issuance) web app that runs credential offers.
- Offers academic credit credentials (e.g. `jp.ac.nii.academic_credit`) and lets you try the full flow of obtaining VCs via a wallet in a local environment.

---

## Prerequisites

| Tool | Purpose |
|------|----------|
| Docker / Docker Compose | Issuer and other backend services |
| [mkcert](https://github.com/FiloSottile/mkcert) | Generate local TLS certificates |
| Node.js | Run the Next.js app (**pnpm** recommended; npm also works) |

> [!NOTE]
> For security reasons we recommend **pnpm** as the Node package manager. To install pnpm: run `corepack enable` then `corepack prepare pnpm@latest --activate`, or see the [pnpm docs](https://pnpm.io/installation).

---

## Setup

### 1. One-time setup

```bash
bash ./scripts/setup_local.sh
```

What the script does:

| # | Step |
|---|------|
| 1 | Fetch submodules (only if missing: `git submodule update --init --recursive`) |
| 2 | Generate OIDC Issuer local files (`eudi-srv-issuer-oidc-py/script/generate_local.sh`) |
| 3 | Apply patches to Issuer (`patch_issuer.sh`) |
| 4 | Certificate setup (`eudi-srv-issuer-oidc-py/script/setup-certs.sh`) |
| 5 | Copy credential definition (`academic_credit_jwt_vc.json` → `credentials_supported/`) |

### 2. Start local services (Docker)

Start Issuer-related local services in the background.

```bash
bash ./scripts/start_local_issuer.sh
```

| Service | Description | Port (example) |
|---------|-------------|----------------|
| `issuer_oidc_local` | OIDC Issuer | 6005 |
| `issuer_backend_local` | Issuer backend | 5001 |
| `issuer_frontend_local` | Issuer frontend | 6007 |

### 3. Start the Next.js app

With Issuer Docker services running, start the demo web app.

```bash
pnpm install   # first time only
pnpm dev
```

Open the URL shown in the terminal (e.g. http://localhost:3000) in your browser.

> [!TIP]
> **Using npm:** Run `npm install` (first time only), then `npm run dev`.

### 4. Stopping

| Target | How to stop |
|--------|-------------|
| Issuer (Docker) | `bash samples/univ-credit-demo/scripts/stop_local_issuer.sh` |
| Next.js | **Ctrl+C** in the terminal where it is running |

---

## Directory structure (summary)

| Path | Description |
|------|-------------|
| `scripts/setup_local.sh` | One-time setup (submodules, certs, patches, resource copy) |
| `scripts/patch_issuer.sh` | Apply univ-credit-demo patches to eudiw, etc. |
| `scripts/start_local_issuer.sh` | Start Docker Compose with local profile (background) |
| `scripts/stop_local_issuer.sh` | Stop Docker Compose local profile |
| `patches/` | Patches applied to eudi-srv-web-issuing-eudiw-py, etc. |
| `resource/academic_credit_jwt_vc.json` | Academic credit credential definition (copied to `credentials_supported/`) |

---

## Notes

> [!NOTE]
> `setup_local.sh` runs `git submodule update --init --recursive` only when submodules are not yet initialized. If they are already cloned, that step is skipped.

> [!TIP]
> To redo certificates or patches, run `setup_local.sh` or `patch_issuer.sh` again as needed.
