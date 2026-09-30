# CYBER-10 — Decentralized Encrypted Cloud File Locker via IPFS & Web3 Auth

> **BBIT HACKATHON 2026 — CODERS' CLUB OFFICIAL HANDBOOK**  
> **Level:** LEVEL 3 — ADVANCED (3RD YEAR RECOMMENDED)  
> **Live Production URL:** [https://hackathon-hazel-three.vercel.app](https://hackathon-hazel-three.vercel.app)  
> **GitHub Repository:** [https://github.com/sohanreja2006/hackathon](https://github.com/sohanreja2006/hackathon)  
> *"Your Files. Encrypted. Decentralized. Yours."*

---

## 🏆 Project Overview & Hackathon Rubric Alignment

CYBER-10 is a zero-knowledge decentralized file locker engineered for whistleblowers, security researchers, privacy-conscious students, and digital creators. It solves the vulnerabilities of centralized cloud storage (Google Drive, Dropbox telemetry and arbitrary account locking) while overcoming the privacy flaw of public IPFS networks by strictly enforcing **client-side authenticated AES-256-GCM encryption before pinning**.

### Core Functional Requirements (32-Hour Handbook Checklist)

| ID | Handbook Specification | Status | Technical Implementation |
|---|---|:---:|---|
| **FR-1** | **Web3 Wallet Authentication** | **100% Complete** ✅ | Sign-In with Ethereum (EIP-4361 / SIWE) via MetaMask & WalletConnect with nonce rotation and HttpOnly cookies. |
| **FR-2** | **Client-Side File Encryption** | **100% Complete** ✅ | Hardware-accelerated Web Crypto API AES-256-GCM encryption with 96-bit random IVs and `.cyber10enc` binary encapsulation. |
| **FR-3** | **Decentralized IPFS Pinning** | **100% Complete** ✅ | Secure server proxy uploading encrypted ciphertext to Pinata IPFS Files API v3, generating immutable CIDs. |
| **FR-4** | **Decentralized File Directory** | **100% Complete** ✅ | Real-time wallet-scoped user dashboard tracking encrypted files, sizes, IPFS CIDs, and upload timestamps. |
| **FR-5** | **1-Click Decrypt & Download** | **100% Complete** ✅ | User signs cryptographic challenge with their wallet; browser decrypts binary on the fly and downloads the original file. |
| **FR-6** | **Token-Gated File Sharing** | **100% Complete** ✅ | Re-encrypts file AES key for a peer wallet address; recipient accesses and decrypts from the "Shared With Me" tab. |

---

## 📑 Mandatory Team Documentation Artifacts (Section 5)

As mandated by the BBIT Hackathon 2026 Handbook, the complete official documentation suite is available in the repository:

1. 📘 **[docs/PLANNING.md](docs/PLANNING.md)** — Architectural blueprint, threat model, binary envelope specification, and technology decision matrix.
2. ⏱️ **[docs/PROGRESS.md](docs/PROGRESS.md)** — 32-hour execution timeline, milestone log, and requirement verification matrix.
3. 🚀 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Production hosting details on Vercel, environment variables guide, and local reproduction steps.
4. 🛡️ **[docs/DEFENSE_QA.md](docs/DEFENSE_QA.md)** — Deep-dive hackathon defense questions and technical answers for judges.

---

## 🔒 Architecture & Data Flow

```
[User Selects File] ──► [Browser RAM: AES-256-GCM Encryption] ──► [.cyber10enc Ciphertext]
                                                                        │
                                                                        ▼ (POST /api/files/upload)
                                                          [Verify SIWE Session + Magic Bytes]
                                                                        │
                                                                        ▼
                                                          [Pinata IPFS Network Pinning]
                                                                        │
                                                                        ▼
                                                          [Immutable Content CID]
                                                                        │
                    ┌───────────────────────────────────────────────────┴────────────────────────────────────────┐
                    ▼                                                                                            ▼
         [FR-5: 1-Click Decrypt]                                                                      [FR-6: Peer Sharing]
      User signs wallet challenge                                                                  Owner re-encrypts key for
                   │                                                                               recipient wallet address
                   ▼                                                                                             │
     Pull ciphertext from IPFS                                                                                   ▼
                   │                                                                               Recipient unlocks in
                   ▼                                                                               "Shared With Me" tab
     Decrypt AES-256-GCM in RAM                                                                                  │
                   │                                                                                             ▼
     Instant browser download                                                                      1-Click peer decryption
```

---

## 💻 Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Cryptography**: Web Crypto API (`window.crypto.subtle`) + AES-256-GCM
- **Web3 / Ethereum**: Viem, Wagmi v2, RainbowKit, EIP-4361 (SIWE), EIP-191
- **Decentralized Storage**: Pinata Cloud IPFS API v3 + IPFS Public Gateways
- **Hosting**: Vercel Serverless Edge

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- MetaMask or any Web3 injected wallet

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/sohanreja2006/hackathon.git
cd hackathon

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Add your PINATA_JWT and AUTH_SESSION_SECRET in .env.local

# 4. Start development server
npm run dev

# 5. Access application
# Open http://localhost:3000 in your browser
```

---

## 🛡️ Core Security Principles

1. **Zero Server-Side Plaintext**: Plaintext bytes never touch any server or network socket.
2. **Authentic Tamper-Resistance**: AES-256-GCM includes 128-bit authentication tags to prevent bit-flipping attacks.
3. **Non-Custodial Sovereignty**: No usernames, passwords, or centralized database root credentials.
4. **Credential Isolation**: All Pinata API tokens remain strictly server-side.
