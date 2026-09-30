# CYBER-10

> **Decentralized Secure File-Storage & Sharing Platform**  
> *"Your Files. Encrypted. Decentralized. Yours."*

---

## 📌 Current Phase

**Phase 4 — Encrypted IPFS Storage via Pinata**

In this phase, we connected the Phase 3 client-side AES-256-GCM encryption engine to permanent IPFS decentralized storage. Only encrypted ciphertext is ever uploaded. The server never receives plaintext or the user's encryption key.

---

## 🗄️ Phase 4 — Encrypted IPFS Storage

### Architecture

```
User selects file
      ↓
Browser reads file (local memory only)
      ↓
AES-256-GCM encryption (Web Crypto API)
      ↓
Encrypted .cyber10enc bundle
      ↓
POST /api/files/upload  ← ONLY ciphertext crosses this boundary
      ↓
Server: verify SIWE session + validate CYBR magic bytes
      ↓
Pinata Files API (Bearer JWT — server-side only)
      ↓
IPFS
      ↓
CID returned to browser
```

### Key Security Properties

1. **Files are encrypted in the browser** — plaintext never leaves the device.
2. **Only ciphertext is uploaded** — the POST body contains a `.cyber10enc` binary blob.
3. **Pinata provides IPFS storage** — encrypted bytes are content-addressed on IPFS.
4. **The CID identifies the encrypted content** — it can be shared safely; the file is unreadable without the key.
5. **Decryption happens locally** — the Retrieve tab fetches encrypted bytes from IPFS and decrypts in the browser.
6. **Pinata credentials are kept server-side** — `PINATA_JWT` is a server-only env var; it never appears in client bundles.
7. **Encryption keys are not stored in plaintext** — keys are shown once to the user and never persisted server-side.

### CYBR Bundle Format

The `.cyber10enc` binary format includes:

```
[4 bytes]  "CYBR" magic header
[1 byte]   Version (0x01)
[12 bytes] AES-GCM 96-bit nonce (IV)
[4 bytes]  filename length (uint32 BE)
[N bytes]  UTF-8 original filename
[4 bytes]  MIME type length (uint32 BE)
[M bytes]  UTF-8 MIME type
[rest]     AES-256-GCM ciphertext + 128-bit auth tag
```

The server validates the `CYBR` magic bytes before accepting any upload, ensuring only encrypted bundles are accepted.

### API Endpoint

```
POST /api/files/upload
Authorization: SIWE HttpOnly session cookie
Content-Type: multipart/form-data

Fields:
  encryptedFile  — binary: .cyber10enc ciphertext bundle
  originalName   — string: original filename (display only)
  originalMime   — string: original MIME type (display only)
  originalSize   — string: original size in bytes (display only)

Response 200:
  { "success": true, "cid": "bafybeig...", "fileId": "...", "size": 123456, "uploadedAt": "..." }

Response 4xx/5xx:
  { "success": false, "error": "Human-readable message" }
```

### Environment Variables

| Variable | Side | Purpose |
|----------|------|---------|
| `PINATA_JWT` | **Server only** | Pinata API authentication |
| `NEXT_PUBLIC_IPFS_GATEWAY_URL` | Client | IPFS gateway for retrieving files |
| `AUTH_SESSION_SECRET` | Server only | HMAC signing for session cookies |

---


## 🔐 Phase 2 — Web3 Authentication Deep Dive

### 1. Why Wallet Connection Alone is NOT Authentication
- Merely connecting an EVM wallet (e.g. via `eth_requestAccounts`) only provides the user's public address.
- A public address is publicly visible on the blockchain and can be trivially spoofed by any client.
- Without a cryptographic digital signature, an attacker could pretend to be any high-profile wallet simply by sending that address in an HTTP header or payload.
- True cryptographic authentication requires the user to **prove private key ownership** by signing an unforgeable challenge message.

### 2. How Sign-In with Ethereum (SIWE / EIP-4361) Works
1. **User Connects Wallet**: User connects MetaMask, Rainbow, or any EVM wallet.
2. **Nonce Request**: Frontend calls `GET /api/auth/nonce?address=0x...`. The server creates and stores a cryptographically random, single-use nonce with a 5-minute TTL.
3. **Challenge Message Assembly**: Frontend constructs a standard EIP-4361 challenge string containing the domain, wallet address, URI, chain ID, issue timestamp, and server nonce.
4. **Wallet Signature**: The user is prompted by their wallet to sign the human-readable challenge off-chain (zero gas fees).
5. **Server Verification**: The signed payload is submitted to `POST /api/auth/verify`. The server verifies that:
   - The nonce exists, is not expired, and has not been used.
   - The recovered address from the ECDSA signature matches the claimed address.
   - The domain and URI match the application origin (blocking cross-dApp phishing).
   - The message timestamp is valid and not expired.
6. **Session Cookie**: On success, the server marks the nonce as used (destroying it) and issues an `HttpOnly`, `SameSite=lax`, `Secure` session cookie signed with HMAC-SHA256.
7. **Protected Access**: The user can now access `/dashboard`.

### 3. Why a Nonce is Required & Single-Use Enforcement
- **Replay Protection**: If messages were static (e.g., "Sign into CYBER-10"), an eavesdropper or malicious proxy could intercept the signature and reuse it indefinitely.
- **Freshness**: Each nonce is generated via `crypto.randomBytes(32)` on the server and expires after 5 minutes.
- **Atomic Invalidation**: The moment a nonce is verified, it is marked as consumed and deleted, making signature replay mathematically impossible.

### 4. How Signature Verification Works
- We utilize `viem/siwe` and `viem`'s `verifyMessage`.
- `verifyMessage` takes the message plaintext and the cryptographic signature `0x...` and recovers the public key using elliptic curve cryptography (`secp256k1`).
- The recovered address must strictly match `message.address`. If an attacker alters the address in the message, the signature is rendered invalid.

### 5. How Sessions Work & Future Phase Helper
- **Tamper-Proof Token**: Sessions are signed with HMAC-SHA256 (`base64url(payload).base64url(hmac)`).
- **Constant-Time Verification**: Verified using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **HttpOnly Enforced**: Client-side JavaScript cannot read the session cookie, eliminating XSS token theft.
- **Account Switching Detection**: If a user switches accounts in MetaMask (e.g., from `0xAAA` to `0xBBB`), the client automatically invalidates the session view and requires fresh SIWE authentication for `0xBBB`.
- **Backend Helper**: Future phases (AES encryption key derivation, IPFS storage, metadata APIs) can call:
  ```ts
  import { getAuthenticatedWallet } from "@/lib/auth/session";

  const auth = await getAuthenticatedWallet();
  if (!auth) {
    throw new Error("Unauthorized: Cryptographic SIWE session required.");
  }
  console.log("Authenticated Wallet:", auth.address);
  ```

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS design tokens
- **Web3 & Wallet**: [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [@rainbow-me/rainbowkit](https://www.rainbowkit.com/)
- **Authentication**: EIP-4361 / Sign-In with Ethereum (SIWE), HMAC-SHA256 Sessions
- **State & Caching**: [@tanstack/react-query](https://tanstack.com/query)
- **Icons**: [Lucide React](https://lucide.dev/)
- **UI Components**: Modern, accessible component architecture

---

## 📦 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure:
```env
# Optional custom WalletConnect Cloud Project ID (fallback ID is provided)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_walletconnect_project_id"

# Server HMAC secret for signing HttpOnly SIWE session cookies
AUTH_SESSION_SECRET="your_strong_32_byte_secret_key_here"
```

---

## 🚀 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles production build |
| `npm run start` | Runs production server |
| `npm run lint` | Runs ESLint analysis |
| `npx tsc --noEmit` | Runs TypeScript static type checking |

---

## 🌐 API Route Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/nonce` | `GET` | Generates a 64-char cryptographically random single-use nonce |
| `/api/auth/verify` | `POST` | Verifies SIWE message + signature and sets `cyber10_session` HttpOnly cookie |
| `/api/auth/session` | `GET` | Returns active session state and authenticated wallet address |
| `/api/auth/logout` | `POST` | Clears the `cyber10_session` cookie and invalidates the session |

---

## 🛡️ Security Review & Vulnerability Checklist

| Security Check | Status | Implementation Details |
| :--- | :---: | :--- |
| 1. Access `/dashboard` without signing blocked? | **YES** | ProtectedRoute strictly checks `isAuthenticated` (requires active SIWE session). |
| 2. Reusing old nonce blocked? | **YES** | `consumeAuthNonce()` atomically deletes nonce upon first check. |
| 3. Reusing old signature blocked? | **YES** | Signature contains single-use nonce; second attempt fails immediately. |
| 4. Address spoofing blocked? | **YES** | `verifyMessage` recovers signer address from ECDSA signature; mismatch throws 401. |
| 5. HttpOnly cookie storage? | **YES** | `cyber10_session` cookie has `httpOnly: true`, preventing XSS theft. |
| 6. Secure cookie flags? | **YES** | `sameSite: "lax"`, `path: "/"`, `secure: true` in production. |
| 7. Cryptographically random nonces? | **YES** | Generated via `crypto.randomBytes(32)` (no Math.random). |
| 8. Single-use nonces? | **YES** | Nonces are marked `used: true` and purged on first use. |
| 9. Expired messages rejected? | **YES** | Nonces expire in 5 min; SIWE expiration timestamps strictly validated. |
| 10. SIWE domain validated? | **YES** | Message domain is checked against `req.headers.host`. |
| 11. SIWE URI validated? | **YES** | Message URI is checked against `req.nextUrl.origin`. |
| 12. Chain ID validated? | **YES** | Verified against active EVM chain ID. |
| 13. Account switching handled? | **YES** | Switching accounts in wallet invalidates session view and requires re-auth. |
| 14. Private keys or seeds requested? | **NO** | Never requested, transmitted, or stored. Off-chain signatures only. |

---

## 🗺 Roadmap Progress

- [x] **Phase 1** — Frontend Foundation & Wallet Connection
- [x] **Phase 2** — Web3 Authentication & SIWE (EIP-4361) *(Completed)*
- [ ] **Phase 3** — Client-side AES encryption (`WebCrypto SubtleAPI` AES-GCM-256)
- [ ] **Phase 4** — IPFS/Pinata decentralized storage integration
- [ ] **Phase 5** — Metadata/database indexing
- [ ] **Phase 6** — Secure asymmetric file sharing & access grants
- [ ] **Phase 7** — Security audit, testnet deployment, and production hardening
