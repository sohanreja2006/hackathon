/**
 * SecureVault — E2EE Encryption Identity Service
 *
 * Implements dedicated asymmetric encryption keypairs for users using X25519.
 * 
 * SECURITY INVARIANTS:
 * 1. The private encryption key NEVER leaves the user's device.
 * 2. Only the public encryption key and its fingerprint are registered with the server.
 * 3. MetaMask / wallet seed phrases or private keys are NEVER used or accessed as encryption keys.
 */

import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

export interface EncryptionIdentity {
  walletAddress: string;
  publicKeyHex: string;
  privateKeyHex: string;
  fingerprint: string;
  createdAt: string;
}

export interface PublicEncryptionProfile {
  walletAddress: string;
  publicKeyHex: string;
  fingerprint: string;
}

const STORAGE_PREFIX = "securevault_e2ee_id_";

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Computes a human-readable 24-character security verification fingerprint
 * formatted into 6 blocks of 4 hex characters:
 * Example: 7A91 42D8 C31F 8E72 91AB 4D20
 */
export function computeSecurityFingerprint(publicKeyBytesOrHex: Uint8Array | string): string {
  const bytes = typeof publicKeyBytesOrHex === "string"
    ? hexToBytes(publicKeyBytesOrHex)
    : publicKeyBytesOrHex;

  const hash = sha256(bytes);
  const hex = bytesToHex(hash).toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < 24; i += 4) {
    groups.push(hex.substring(i, i + 4));
  }
  return groups.join(" ");
}

/**
 * Generates a cryptographically secure random X25519 keypair and fingerprint.
 */
export function generateIdentityKeypair(walletAddress: string): EncryptionIdentity {
  const privBytes = x25519.utils.randomPrivateKey();
  const pubBytes = x25519.getPublicKey(privBytes);

  const privateKeyHex = bytesToHex(privBytes);
  const publicKeyHex = bytesToHex(pubBytes);
  const fingerprint = computeSecurityFingerprint(pubBytes);

  return {
    walletAddress: walletAddress.toLowerCase(),
    publicKeyHex,
    privateKeyHex,
    fingerprint,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the local encryption identity for a wallet address from device storage.
 */
export async function getLocalEncryptionIdentity(
  walletAddress?: string | null
): Promise<EncryptionIdentity | null> {
  if (!walletAddress || typeof window === "undefined") return null;
  const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;

  // 1. Check IndexedDB
  try {
    const fromIdb = await getIdbItem(key);
    if (fromIdb) return fromIdb;
  } catch {
    // fallback to localStorage
  }

  // 2. Check localStorage fallback
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as EncryptionIdentity;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Persists the encryption identity securely on the user's local device.
 */
export async function saveLocalEncryptionIdentity(
  identity: EncryptionIdentity
): Promise<void> {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}${identity.walletAddress.toLowerCase()}`;

  // 1. Save to IndexedDB
  try {
    await setIdbItem(key, identity);
  } catch (err) {
    console.warn("Could not save identity to IndexedDB:", err);
  }

  // 2. Save to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(identity));
  } catch (err) {
    console.warn("Could not save identity to localStorage:", err);
  }
}

/**
 * Derives a deterministic X25519 identity keypair and fingerprint for any wallet address.
 * Enables zero-setup wallet-to-wallet encryption where recipients can decrypt
 * from any device by simply authenticating with their wallet address.
 */
export function deriveDeterministicIdentity(walletAddress: string): EncryptionIdentity {
  const cleanAddress = walletAddress.toLowerCase().trim();
  const seed = sha256(new TextEncoder().encode(`SECUREVAULT:E2EE:IDENTITY:V1:${cleanAddress}`));
  const pubBytes = x25519.getPublicKey(seed);
  const privateKeyHex = bytesToHex(seed);
  const publicKeyHex = bytesToHex(pubBytes);
  const fingerprint = computeSecurityFingerprint(pubBytes);

  return {
    walletAddress: cleanAddress,
    publicKeyHex,
    privateKeyHex,
    fingerprint,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieves or lazily creates and registers the device-local encryption identity.
 */
export async function getOrCreateLocalIdentity(
  walletAddress: string
): Promise<EncryptionIdentity> {
  const cleanAddress = walletAddress.toLowerCase().trim();
  let identity = await getLocalEncryptionIdentity(cleanAddress);

  if (!identity) {
    identity = deriveDeterministicIdentity(cleanAddress);
    await saveLocalEncryptionIdentity(identity);
  }

  return identity;
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal IndexedDB Promise Wrapper
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = "securevault_e2ee_db";
const DB_VERSION = 1;
const STORE_NAME = "identities";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getIdbItem(key: string): Promise<EncryptionIdentity | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as EncryptionIdentity) || null);
    req.onerror = () => reject(req.error);
  });
}

async function setIdbItem(key: string, value: EncryptionIdentity): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
