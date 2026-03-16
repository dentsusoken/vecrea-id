# univ-mock-idp

A mock SAML Identity Provider (IdP) that simulates a university authentication system. Used together with the OID4VCI Issuer backend to issue University Student VCs.

---

## Quick start

```bash
# 1. Generate keys and create .env
bash scripts/setup.sh

# 2. Install dependencies and start
npm install
npm run dev
```

The mock IdP starts at http://localhost:4000.

---

## Overview

- An **Express + TypeScript** server that acts as a SAML 2.0 IdP.
- Accepts a SAMLRequest from the SP (Issuer backend), shows an email/password login form, and POSTs a signed SAMLResponse to the SP's ACS URL.
- Intended for local development only — credentials are validated against the static list in `config/users.json`.

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| Node.js | Run the server |
| openssl | Generate self-signed certificate and private key (`scripts/setup.sh`) |

---

## Setup

### 1. Generate keys

```bash
bash scripts/setup.sh
```

What the script does:

| # | Step |
|---|------|
| 1 | Generate a self-signed RSA 2048 certificate and private key with openssl |
| 2 | Base64-encode both and write them to `.env` as `PRIVATE_KEY` / `PUBLIC_KEY` |
| 3 | Print the `SAML_IDP_CERT` value for use in the Issuer backend |

Copy the `SAML_IDP_CERT` value printed at the end and set it in the Issuer backend's `.env.local`:

```
SAML_IDP_CERT=<printed value>
```

### 2. Start the server

```bash
npm install   # first time only
npm run dev
```

The mock IdP starts at http://localhost:4000 (SSO endpoint: `http://localhost:4000/sso`), but **do not access it directly**. The authentication flow starts from the Issuer backend at `http://localhost:5001/saml/login`, which redirects here automatically.

### 3. Stopping

**Ctrl+C** in the terminal where the server is running.

---

## Mock users

The following users are defined in `config/users.json`:

| Name | Email | Password | University | Enrollment Year |
|------|-------|----------|-----------|----------------|
| Taro Yamada | taro.yamada@aaa-university.jp | password1 | AAA University | 2022 |
| Hanako Suzuki | hanako.suzuki@bbb-university.jp | password2 | BBB University | 2023 |
| Kenji Tanaka | kenji.tanaka@ccc-university.jp | password3 | CCC University | 2024 |

---

## Directory structure

| Path | Description |
|------|-------------|
| `scripts/setup.sh` | Generate self-signed cert/key and write `.env` |
| `config/users.json` | Mock user definitions |
| `src/index.ts` | Express server (SSO endpoint, SAMLResponse generation) |
| `.env.example` | Environment variable template |

---

## Notes

> [!NOTE]
> `setup.sh` will ask for confirmation before overwriting an existing `.env`.

> [!NOTE]
> The SAML signing keys are generated locally and are not shared. If `setup.sh` is re-run, the `SAML_IDP_CERT` value changes and must be updated in the Issuer backend's `.env.local`.

> [!WARNING]
> This IdP is for local development only. Credentials are checked only against the static `config/users.json` and must not be used in production.
