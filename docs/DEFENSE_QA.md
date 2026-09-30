# CYBER-10 — Hackathon Defense Q&A & Technical Defense Guide

> **BBIT HACKATHON 2026 — CODERS' CLUB OFFICIAL HANDBOOK**  
> **Track:** LEVEL 3 — ADVANCED (CYBER-10)  
> **Focus:** Technical Defense, Rubric Alignment, Cryptography & Privacy Architecture

---

## 1. Core Architecture & Cryptography

### Q1: Why use AES-256-GCM instead of AES-CBC or standard RSA?
**Answer:**
- **Authenticated Encryption with Associated Data (AEAD)**: AES-GCM provides both confidentiality AND cryptographic integrity in a single pass. Unlike AES-CBC (which is vulnerable to padding oracle attacks unless combined with HMAC in an Encrypt-then-MAC scheme), GCM generates an authentication tag (128-bit) that detects any bit-flipping, truncation, or tampering before decryption.
- **Hardware Acceleration**: The Web Crypto API implements AES-GCM using native CPU instructions (AES-NI on x86/64, ARMv8 Cryptography Extensions on Apple Silicon / mobile), allowing 50MB files to be encrypted/decrypted in milliseconds directly in browser RAM.
- **Why not RSA?**: RSA is strictly an asymmetric cipher meant for small payloads (typically < 446 bytes for RSA-4096). Encrypting large files directly with asymmetric cryptography is computationally prohibitive and architecturally incorrect. Hybrid cryptography (AES for payload, asymmetric key wrapping for peers) is the industry standard.

---

### Q2: What prevents the server from eavesdropping on user files?
**Answer:**
- The plaintext `File` object never leaves the client's execution thread.
- Encryption occurs strictly in the browser memory using `window.crypto.subtle.encrypt`.
- The payload sent over HTTP to `/api/files/upload` is already serialized ciphertext within our proprietary `.cyber10enc` binary container.
- Even if a malicious attacker intercepts the HTTP request, compromises the Next.js API server, or seizes the Pinata account, they obtain only opaque ciphertext with random 96-bit IVs.

---

### Q3: How is key management handled without requiring users to type a 64-character hex key every time?
**Answer:**
- CYBER-10 implements **Wallet-Derived Cryptographic Keys (FR-5)**:
  - Users sign a deterministic EIP-191 challenge with their Ethereum wallet (`CYBER-10 Protocol Sovereign Decrypt Verification`).
  - The wallet's ECDSA signature serves as an entropy seed.
  - Using Web Crypto SHA-256 HKDF derivation, the application unlocks the file's decryption key in-memory.
  - This delivers a seamless **1-Click Decrypt & Download** experience while maintaining zero-knowledge architecture.

---

### Q4: How does Peer-to-Peer Encrypted File Sharing (FR-6) work without sharing the private key?
**Answer:**
- When User A shares a file with User B's Ethereum address (`0x...`):
  1. The original file ciphertext on IPFS remains unchanged (no expensive re-upload).
  2. The file's AES-256 key is re-encrypted using an access-grant envelope specifically bound to User B's public address and a unique salt.
  3. User B connects their wallet, navigates to the **"Shared With Me"** tab, and clicks **"Decrypt Shared"**.
  4. User B signs a cryptographic authorization challenge; the client unwraps the peer envelope and decrypts the IPFS ciphertext locally in their browser.
  5. No unauthorized wallet can decrypt the envelope because the key unwrapping is mathematically tied to the designated recipient address.

---

## 2. IPFS, Decentralization & Reliability

### Q5: What if an IPFS gateway goes down or experiences rate limits?
**Answer:**
- IPFS is content-addressable by design. Because files are referenced by their cryptographic hash (CIDv1), the data is decoupled from any single domain name.
- CYBER-10 supports pluggable gateways via `NEXT_PUBLIC_IPFS_GATEWAY_URL`. If `gateway.pinata.cloud` is congested, the application seamlessly fails over to `ipfs.io`, `cloudflare-ipfs.com`, or any dedicated IPFS node without changing the underlying file.

---

### Q6: Does CYBER-10 require users to pay Ethereum gas fees for authentication or encryption?
**Answer:**
- **Zero Gas Cost**: Both EIP-4361 (Sign-In with Ethereum) and our 1-click decryption challenges utilize off-chain cryptographic signatures (`personal_sign` / EIP-191).
- Signing messages is completely gasless, requires zero ETH balance, and runs instantly in any Web3 wallet.

---

### Q7: How does CYBER-10 scale for large files up to 50MB?
**Answer:**
- File reading is performed using `ArrayBuffer` slicing rather than inefficient base64 string conversions (which bloat file size by 33%).
- The binary `.cyber10enc` format prepends a compact binary header (magic bytes + IV + file metadata) directly to the raw ciphertext, maintaining minimal overhead and optimal streaming throughput.
