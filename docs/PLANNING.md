# CYBER-10 — System Planning & Architectural Specification

> **BBIT HACKATHON 2026 — CODERS' CLUB OFFICIAL HANDBOOK**  
> **Track:** LEVEL 3 — ADVANCED (3RD YEAR RECOMMENDED)  
> **Project:** CYBER-10 (Decentralized Encrypted Cloud File Locker via IPFS & Web3 Auth)  
> **Production Deployment:** [https://hackathon-hazel-three.vercel.app](https://hackathon-hazel-three.vercel.app)

---

## 1. Executive Summary & Problem Formulation

Centralized cloud storage providers (Google Drive, Dropbox, iCloud) maintain root access to user storage volumes. They perform automated telemetry scanning, monetize metadata, and have arbitrary authority to freeze accounts or yield unencrypted files to third-party subpoenas. 

Conversely, uploading raw unencrypted files to decentralized storage (IPFS, Arweave) exposes sensitive files to global public peer swarms.

**CYBER-10 resolves this fundamental trilemma** by unifying:
1. **Zero-Knowledge Client-Side Encryption (AES-256-GCM)** via the browser's native hardware-accelerated Web Crypto API.
2. **Decentralized Content-Addressable Storage (IPFS via Pinata)** for censorship-resistant, distributed data persistence.
3. **Sovereign Cryptographic Identity (SIWE / EIP-4361)**, tying decryption authorization and peer access grants strictly to Ethereum wallet signatures without centralized passwords or custodial secrets.

---

## 2. Threat Model & Security Posture

| Threat Vector | Attack Mechanism | CYBER-10 Mitigation |
|---|---|---|
| **Malicious Server / Compromised API** | Attacker obtains full database & server access. | Server **never** receives plaintext. All encryption occurs in browser RAM before HTTP transmission. Server only handles opaque `.cyber10enc` ciphertext binaries. |
| **Public IPFS Gateway Eavesdropping** | Third-party sniffers monitor IPFS CIDs on public DHT nodes. | Files on IPFS are AES-256-GCM ciphertext with random 96-bit nonces. Content is mathematically indistinguishable from pseudorandom noise without the key. |
| **Data Tampering & Bit-Flipping** | Attacker alters ciphertext bytes on an untrusted IPFS storage node. | AES-256-GCM includes an authenticated 128-bit integrity tag. Any bit manipulation fails decryption instantly during tag verification. |
| **Authentication Replay Attacks** | Replay of prior signed auth messages to hijack sessions. | EIP-4361 SIWE nonce rotation with cryptographically random hex nonces, single-use invalidation, and expiration timestamps. |
| **Key Leakage via Logs / URLs** | Secrets logged in browser history or reverse proxy logs. | AES keys are never placed in URLs, headers, or query parameters. Keys reside strictly in ephemeral client memory or wallet-isolated storage. |

---

## 3. Cryptographic Architecture & Data Flow

### 3.1 Binary Envelope Specification (`.cyber10enc`)
To guarantee cross-platform portability without leaking file metadata to IPFS, CYBER-10 serializes encrypted files into a custom binary container:

```
+-----------------------------------------------------------------------------------+
| MAGIC BYTES | VERSION | IV (NONCE) | NAME LEN | ORIGINAL FILENAME | MIME LEN | MIME TYPE | CIPHERTEXT + AUTH TAG |
|   4 bytes   |  1 byte |  12 bytes  |  4 bytes |     N bytes       |  4 bytes |  M bytes  |       X bytes         |
|   "CYBR"    |  0x01   |   Random   |  Uint32  |      UTF-8        |  Uint32  |   UTF-8   |     AES-256-GCM       |
+-----------------------------------------------------------------------------------+
```

### 3.2 Upload & Encryption Pipeline (FR-2 & FR-3)
```
[User Selects File]
        │
        ▼ (Local Browser Memory)
[Web Crypto API: Generate random 256-bit AES Key & 96-bit IV]
        │
        ▼
[AES-256-GCM Authenticated Encryption] ───► [Produces .cyber10enc Binary Blob]
        │                                                    │
        ▼                                                    ▼ (Multipart HTTP)
[Key displayed to user / saved to registry]           [/api/files/upload]
                                                             │
                                                             ▼ (Pinata Files API v3)
                                                      [Pinned to IPFS Swarm]
                                                             │
                                                             ▼
                                                    [Immutable IPFS CID]
```

### 3.3 1-Click Decrypt & Download Flow (FR-5)
```
[User Clicks Decrypt on Dashboard]
        │
        ▼
[Wallet Prompts Cryptographic Signature Challenge (EIP-191)]
        │
        ▼ (Signature Verified Locally)
[Fetch Ciphertext from IPFS Gateway via CID]
        │
        ▼
[Parse .cyber10enc Header: Extract IV, Name, MIME Type]
        │
        ▼
[AES-256-GCM In-Memory Decryption & Integrity Verification]
        │
        ▼
[Browser Triggers Instant File Download of Original File]
```

### 3.4 Peer-to-Peer Encrypted File Sharing (FR-6)
```
[Owner Clicks Share with Peer]
        │
        ▼
[Input: Recipient Ethereum Address 0x...]
        │
        ▼
[Derive Key Wrapping Envelope for Recipient: SHA-256(recipientAddress + salt)]
        │
        ▼
[AES-256-GCM Re-Encrypt File Key for Recipient Envelope]
        │
        ▼
[Store Share Grant in Decentralized Registry]
        │
        ▼ (Recipient Logs in with Wallet)
[Appears in Recipient's "Shared With Me" Dashboard]
        │
        ▼
[Recipient Signs Authorization Challenge -> Unwraps Key -> Decrypts IPFS File]
```

---

## 4. Technology Stack & Decision Matrix

- **Next.js 16 (App Router & Turbopack)**: State-of-the-art React framework offering lightning-fast server routes for IPFS multipart proxying while isolating server secrets from client code.
- **Web Crypto API (`window.crypto.subtle`)**: Native browser cryptographic runtime. Eliminates slow user-space JavaScript crypto libraries and utilizes OS hardware acceleration (Intel AES-NI / Apple Silicon Crypto Engines).
- **Viem & Wagmi v2**: Type-safe, low-latency Ethereum interaction layer with first-class EIP-4361 SIWE support.
- **RainbowKit**: Enterprise-grade multi-wallet connection modal (MetaMask, WalletConnect, Coinbase Wallet, Brave).
- **Pinata IPFS Cloud API v3**: High-availability IPFS node pinning service ensuring content-addressed chunks remain persistently online across global peer nodes.
- **Tailwind CSS**: Precision cyberpunk UI system with high-contrast data visualizers, glassmorphism, and responsive tables.
- **Vercel**: Edge-optimized serverless deployment infrastructure.
