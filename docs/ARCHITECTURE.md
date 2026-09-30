# SecureVault — Full-Stack Architecture & Directory Structure

SecureVault is built with a **Modular Full-Stack Architecture** inside a Next.js App Router application.

The project strictly enforces a **Zero-Knowledge Security Boundary**:
- **Client (Frontend)**: Encrypts files, derives AES-256 keys, verifies SHA-256 integrity, manages local key storage, and performs client-side decryption.
- **Server (Backend)**: Verifies Web3 SIWE signatures, pins ciphertext to IPFS via Pinata, manages Payload CMS metadata & chunk indexes, and generates Secure Share Codes. The server **NEVER** touches plaintext or file encryption keys.

---

## Directory Organization

```
src/
├── app/                        # Next.js App Router (Routing Layer)
│   ├── (pages)                 # Frontend Pages & Views
│   │   ├── page.tsx            # Landing Page
│   │   ├── dashboard/          # Vault Dashboard & Encrypt Views
│   │   │   ├── page.tsx
│   │   │   ├── encrypt/page.tsx
│   │   │   └── vault/page.tsx
│   │   ├── auth/signin/        # Web3 Authentication Gate
│   │   └── receive/page.tsx    # Secure Share Code Recipient Portal
│   │
│   └── api/                    # Backend API Route Handlers
│       ├── auth/               # SIWE Nonce, Verify, Session, Logout
│       │   ├── nonce/route.ts
│       │   ├── verify/route.ts
│       │   ├── session/route.ts
│       │   └── logout/route.ts
│       ├── files/              # IPFS Pinata Upload & Gateway Proxy
│       │   ├── upload/route.ts
│       │   ├── download/route.ts
│       │   └── upload-url/route.ts
│       └── payload/            # Payload CMS Collections & Share API
│           ├── files/route.ts
│           ├── chunks/route.ts
│           ├── manifests/route.ts
│           └── shares/         # Share Generation, Lookup, Access, Revocation
│               ├── route.ts
│               ├── lookup/route.ts
│               ├── access/route.ts
│               └── [id]/revoke/route.ts
│
├── frontend/                   # Client-Side Application Layer (@/frontend)
│   ├── components/             # React UI Components
│   │   ├── auth/               # ProtectedRoute & Auth Guards
│   │   ├── dashboard/          # RecentFiles, FileDetailsModal, ShareModals
│   │   ├── encryption/         # FileEncryptionPanel (WebCrypto AES-256 UI)
│   │   ├── layout/             # Navbar, Sidebar, Footer
│   │   ├── ui/                 # OwlCompanion, Cards, Buttons, Badges
│   │   └── vault/              # VaultTabs, VaultUploadPanel, VaultRetrievePanel
│   ├── crypto/                 # Client Hardware-Accelerated Cryptography
│   │   └── index.ts            # AES-256-GCM, exportKeyToHex, importKeyFromHex
│   ├── vault/                  # Local Browser Vault & Key Management
│   │   └── index.ts            # VaultX Wallet, localStorage file registry
│   ├── services/               # Client-Side API Clients
│   │   └── index.ts            # Payload API Client, IPFS Multi-Gateway, Share Codes
│   └── index.ts                # Unified Frontend Barrel Export
│
├── backend/                    # Server-Side Services Layer (@/backend)
│   ├── auth/                   # Web3 & SIWE Authentication
│   │   ├── siwe.ts             # EIP-4361 Signature Verification
│   │   ├── nonce.ts            # Cryptographic Nonce Store & Consumption
│   │   ├── session.ts          # HMAC-SHA256 HttpOnly Cookie Sessions
│   │   └── index.ts            # Barrel Export
│   ├── ipfs/                   # Decentralized Storage Services
│   │   ├── pinata.ts           # Server-to-Pinata IPFS Pinning (PINATA_JWT)
│   │   └── index.ts            # Barrel Export
│   ├── payload/                # Payload CMS & Drive Metadata Engine
│   │   ├── service.ts          # Payload Service Client
│   │   ├── store.ts            # File, Chunk, Manifest & Share Store
│   │   ├── collections.ts      # CMS Collections Schemas
│   │   ├── types.ts            # Payload Core Data Models
│   │   └── index.ts            # Barrel Export
│   └── index.ts                # Unified Backend Barrel Export
│
├── components/                 # Root UI Components (Re-exported via @/frontend)
├── context/                    # React Context (Auth, Theme)
├── hooks/                      # Custom React Hooks
├── providers/                  # Application Providers (Wagmi, Theme, Query)
└── types/                      # Shared Global TypeScript Types
```

---

## Import Aliases (`tsconfig.json`)

To keep imports clean and maintain modular boundaries:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/frontend/*": ["./src/frontend/*"],
      "@/backend/*": ["./src/backend/*"]
    }
  }
}
```

### Examples:
- **In an API route** (`src/app/api/...`):
  ```typescript
  import { payloadService, verifySiweSignature } from "@/backend";
  ```
- **In a frontend page or component** (`src/app/...` or `src/components/...`):
  ```typescript
  import { encryptFile, generateAesKey } from "@/frontend/crypto";
  import { accessSecureShare, lookupSecureShare } from "@/frontend/services";
  import { OwlCompanion } from "@/frontend/components";
  ```

---

## Zero-Knowledge Boundary Guarantee

| Operation | Executed On | Server Visibility |
| :--- | :--- | :--- |
| **AES-256 Key Generation** | Browser (`WebCrypto`) | Zero (Never sent to server) |
| **File Encryption** | Browser (`WebCrypto`) | Zero (Only ciphertext leaves device) |
| **SHA-256 Checksum** | Browser | Hash stored for integrity verification |
| **Ciphertext Upload** | Server (`/api/files/upload`) | Sees ciphertext only (No plaintext) |
| **File Decryption** | Browser (`WebCrypto`) | Zero (Done client-side with user's key) |
| **Share URL `#key=...`** | Browser Fragment | Zero (Browsers never transmit `#` over HTTP) |
