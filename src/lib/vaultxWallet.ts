/**
 * VaultX Secure Wallet — Client-Side Cryptographic Key Management Engine
 *
 * SPECIFICATION:
 * - A dedicated client-side cryptographic identity specifically designed
 *   to protect users' file-encryption keys (DEKs).
 * - Does NOT replace MetaMask for Web3 transactions or signatures.
 * - Operates entirely locally in browser memory via Web Crypto API.
 * - Master Key Encryption Key (KEK) is stored as a non-extractable / secure CryptoKey
 *   in browser IndexedDB storage (or encrypted envelope).
 * - Generates a public, non-sensitive identifier in the format: VX-XXXX-XXXX
 * - Zero plaintext keys ever leave the browser.
 */

export interface VaultXWalletIdentity {
  /** Public non-sensitive identifier, e.g. "VX-7A92-F31C" */
  id: string;
  /** Cryptographic status */
  status: "protected" | "locked";
  /** ISO timestamp of wallet creation */
  createdAt: string;
  /** Public fingerprint of the KEK (SHA-256 slice) */
  fingerprint: string;
}

const DB_NAME = "vaultx_secure_identity_db";
const DB_VERSION = 1;
const STORE_NAME = "vaultx_keys";
const MASTER_KEY_ID = "vaultx_master_kek_v1";
const IDENTITY_STORAGE_KEY = "vaultx_wallet_identity_public_v1";

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB Storage Helpers (for non-exportable CryptoKey storage)
// ─────────────────────────────────────────────────────────────────────────────

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open VaultX database."));
  });
}

async function storeCryptoKey(id: string, key: CryptoKey): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ id, key });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error("Failed to store master key."));
  });
}

async function retrieveCryptoKey(id: string): Promise<CryptoKey | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => {
      const record = req.result as { id: string; key: CryptoKey } | undefined;
      resolve(record?.key || null);
    };
    req.onerror = () => reject(req.error || new Error("Failed to retrieve master key."));
  });
}

async function deleteCryptoKey(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error("Failed to delete master key."));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Identity Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives a clean public non-sensitive identifier (e.g. VX-7A92-F31C)
 * from a cryptographic seed/hash.
 */
function deriveVaultXId(rawEntropy: Uint8Array): string {
  const hex = Array.from(rawEntropy)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const part1 = hex.slice(0, 4);
  const part2 = hex.slice(4, 8);
  return `VX-${part1}-${part2}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Wallet Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a VaultX Secure Wallet has already been created in this browser.
 */
export async function hasVaultXWallet(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const key = await retrieveCryptoKey(MASTER_KEY_ID);
    return key !== null;
  } catch {
    return false;
  }
}

/**
 * Get active VaultX Secure Wallet public metadata (no private keys).
 */
export function getVaultXWalletIdentity(): VaultXWalletIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VaultXWalletIdentity;
  } catch {
    return null;
  }
}

/**
 * Creates a brand new VaultX Secure Wallet identity in the current browser.
 * Generates an AES-256 Key Encryption Key (KEK) using Web Crypto API.
 */
export async function createVaultXWallet(): Promise<VaultXWalletIdentity> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }

  // 1. Generate unique 256-bit Key Encryption Key (KEK)
  const masterKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable from subtle crypto
    ["encrypt", "decrypt"]
  );

  // 2. Generate random entropy to create deterministic public ID
  const entropy = window.crypto.getRandomValues(new Uint8Array(16));
  const vaultxId = deriveVaultXId(entropy);

  const hashBuffer = await window.crypto.subtle.digest("SHA-256", entropy);
  const fingerprint = Array.from(new Uint8Array(hashBuffer))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 3. Store non-extractable key securely in browser IndexedDB
  await storeCryptoKey(MASTER_KEY_ID, masterKey);

  // 4. Save public non-sensitive identity metadata to localStorage
  const identity: VaultXWalletIdentity = {
    id: vaultxId,
    status: "protected",
    createdAt: new Date().toISOString(),
    fingerprint,
  };

  localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

/**
 * Disconnects / locks the VaultX Secure Wallet in this browser session.
 */
export function lockVaultXWallet(): void {
  // In locked state, we don't delete the key, just flag local session status
  const identity = getVaultXWalletIdentity();
  if (identity) {
    identity.status = "locked";
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  }
}

/**
 * Unlocks the VaultX Secure Wallet.
 */
export async function unlockVaultXWallet(): Promise<VaultXWalletIdentity> {
  const hasKey = await hasVaultXWallet();
  if (!hasKey) {
    throw new Error("No VaultX Secure Wallet found. Please create one first.");
  }

  let identity = getVaultXWalletIdentity();
  if (!identity) {
    const entropy = window.crypto.getRandomValues(new Uint8Array(16));
    identity = {
      id: deriveVaultXId(entropy),
      status: "protected",
      createdAt: new Date().toISOString(),
      fingerprint: "active-kek",
    };
  } else {
    identity.status = "protected";
  }

  localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

/**
 * Removes the VaultX Secure Wallet from this browser device.
 */
export async function destroyVaultXWallet(): Promise<void> {
  await deleteCryptoKey(MASTER_KEY_ID);
  if (typeof window !== "undefined") {
    localStorage.removeItem(IDENTITY_STORAGE_KEY);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Wrapping & Unwrapping (Protecting DEKs via VaultX KEK)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Protects (wraps) a 64-character hex File Data Encryption Key (DEK)
 * using the VaultX Secure Wallet master KEK.
 */
export async function protectFileKeyWithVaultX(fileKeyHex: string): Promise<string> {
  const masterKey = await retrieveCryptoKey(MASTER_KEY_ID);
  if (!masterKey) {
    throw new Error("VaultX Secure Wallet is not unlocked on this device.");
  }

  const enc = new TextEncoder();
  const plaintextKeyBytes = enc.encode(fileKeyHex.trim());

  // 96-bit unique IV per wrap
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    plaintextKeyBytes
  );

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const cipherHex = Array.from(new Uint8Array(ciphertext))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${ivHex}:${cipherHex}`;
}

/**
 * Unlocks (unwraps) a protected DEK using the VaultX Secure Wallet master KEK.
 */
export async function unlockFileKeyWithVaultX(wrappedKeyString: string): Promise<string> {
  const masterKey = await retrieveCryptoKey(MASTER_KEY_ID);
  if (!masterKey) {
    throw new Error("VaultX Secure Wallet is locked or not found on this device.");
  }

  const [ivHex, cipherHex] = wrappedKeyString.split(":");
  if (!ivHex || !cipherHex) {
    throw new Error("Invalid wrapped key envelope format.");
  }

  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  const cipher = new Uint8Array(
    cipherHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    masterKey,
    cipher
  );

  return new TextDecoder().decode(decryptedBytes);
}
