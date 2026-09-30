# CYBER-10 — Deployment & Production Guide

> **BBIT HACKATHON 2026 — CODERS' CLUB OFFICIAL HANDBOOK**  
> **Project:** CYBER-10 (Decentralized Encrypted Cloud File Locker via IPFS & Web3 Auth)  
> **Live Production URL:** [https://hackathon-hazel-three.vercel.app](https://hackathon-hazel-three.vercel.app)  
> **Source Repository:** [https://github.com/sohanreja2006/hackathon](https://github.com/sohanreja2006/hackathon)

---

## 1. Production Architecture Overview

The CYBER-10 production deployment is hosted on **Vercel Edge & Serverless Infrastructure**, backed by **Pinata IPFS** for decentralized storage:

- **Frontend Application**: Next.js 16 (App Router + Turbopack) served globally via Vercel's global CDN.
- **Serverless API Routes**:
  - `/api/auth/nonce`: Generates unique single-use cryptographic nonces for SIWE.
  - `/api/auth/verify`: Verifies EIP-4361 wallet signatures using `viem` and issues HttpOnly session cookies.
  - `/api/auth/session`: Validates active wallet session state.
  - `/api/auth/logout`: Clears authentication cookies and invalidates session.
  - `/api/files/upload`: Server-side proxy uploading encrypted `.cyber10enc` binary to Pinata IPFS Files API v3.
- **Decentralized Storage**: Pinata IPFS network providing content-addressable storage (CIDs) and public gateway routing.

---

## 2. Environment Variables Configuration

Set these variables in your Vercel Project Settings under **Settings → Environment Variables**:

| Variable Name | Environment | Purpose | Security Level |
|---|---|---|---|
| `PINATA_JWT` | Production, Preview, Development | Bearer token for authenticating to Pinata IPFS upload API | **Confidential (Server-Only)** |
| `AUTH_SESSION_SECRET` | Production, Preview, Development | 32+ character HMAC key used to sign HttpOnly SIWE session cookies | **Confidential (Server-Only)** |
| `NEXT_PUBLIC_IPFS_GATEWAY_URL` | Production, Preview, Development | Gateway URL for downloading ciphertext (e.g., `https://gateway.pinata.cloud`) | Public |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Production, Preview, Development | WalletConnect Cloud Project ID for Web3 wallet connection modal | Public |

> [!CAUTION]
> `PINATA_JWT` and `AUTH_SESSION_SECRET` must **never** be prefixed with `NEXT_PUBLIC_`.

---

## 3. Local Development Setup

To run CYBER-10 locally on your development machine:

```bash
# 1. Clone repository
git clone https://github.com/sohanreja2006/hackathon.git
cd hackathon

# 2. Install dependencies (runs automatic qr border patch postinstall)
npm install

# 3. Create .env.local file
cp .env.example .env.local
# Add your Pinata JWT and session secret to .env.local

# 4. Start local development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

---

## 4. Production Build & Deployment Commands

```bash
# Validate local build passes cleanly
npm run build

# Deploy directly to Vercel via CLI
npx vercel --prod --yes
```
