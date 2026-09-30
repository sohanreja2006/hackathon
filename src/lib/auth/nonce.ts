import { randomBytes } from "crypto";

/**
 * CYBER-10 Nonce Management Service
 * 
 * Provides single-use, short-lived, cryptographically random nonces
 * for EIP-4361 / Sign-In with Ethereum (SIWE) verification.
 * 
 * Security Controls:
 * 1. Cryptographically secure random entropy (crypto.randomBytes).
 * 2. Short Time-To-Live (TTL): 5 minutes expiration.
 * 3. Strict Single-Use: Nonces are immediately marked as used upon validation.
 * 4. Automatic memory cleanup of stale nonces.
 */

interface NonceEntry {
  nonce: string;
  address?: string;
  expiresAt: number;
  used: boolean;
}

// Global in-memory nonce store (persists across API requests in server runtime)
const globalNonceStore = new Map<string, NonceEntry>();

// Nonce validity duration: 5 minutes (300,000 ms)
const NONCE_TTL_MS = 5 * 60 * 1000;

/**
 * Periodically purge expired nonces to prevent memory leaks
 */
function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [nonce, entry] of globalNonceStore.entries()) {
    if (now > entry.expiresAt || entry.used) {
      globalNonceStore.delete(nonce);
    }
  }
}

/**
 * Generates a cryptographically random, single-use nonce for SIWE.
 * Optionally binds the nonce to a target wallet address.
 */
export function generateAuthNonce(targetAddress?: string): string {
  cleanupExpiredNonces();

  // 32 bytes of secure random entropy (64 hex characters)
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;

  globalNonceStore.set(nonce, {
    nonce,
    address: targetAddress ? targetAddress.toLowerCase() : undefined,
    expiresAt,
    used: false,
  });

  return nonce;
}

/**
 * Validates and atomically consumes a nonce.
 * Returns true ONLY IF the nonce exists, has not expired, has not been used,
 * and matches the claimed wallet address (if address binding was used).
 * 
 * CRITICAL: Immediately marks the nonce as used and deletes it to prevent replay attacks.
 */
export function consumeAuthNonce(nonce: string, claimedAddress?: string): boolean {
  cleanupExpiredNonces();

  if (!nonce || typeof nonce !== "string") {
    return false;
  }

  const entry = globalNonceStore.get(nonce);
  if (!entry) {
    return false; // Nonce not found
  }

  // Check if nonce was already consumed
  if (entry.used) {
    globalNonceStore.delete(nonce);
    return false;
  }

  // Check if nonce is expired
  if (Date.now() > entry.expiresAt) {
    globalNonceStore.delete(nonce);
    return false;
  }

  // Check address binding if specified
  if (entry.address && claimedAddress) {
    if (entry.address !== claimedAddress.toLowerCase()) {
      globalNonceStore.delete(nonce);
      return false; // Nonce was issued to a different wallet
    }
  }

  // Atomically consume nonce
  entry.used = true;
  globalNonceStore.delete(nonce);
  return true;
}
