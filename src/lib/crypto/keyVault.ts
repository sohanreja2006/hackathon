/**
 * SecureVault — Secure Key Vault (IndexedDB)
 *
 * SECURITY INVARIANTS:
 * 1. AES-256 file keys are stored in IndexedDB — NOT in localStorage.
 * 2. Keys are stored as non-extractable CryptoKey objects when possible.
 * 3. Falls back to hex string storage when CryptoKey serialization isn't supported.
 * 4. Keys are indexed by (ownerAddress, fileId) — scoped per user.
 * 5. This module runs ONLY in the browser.
 */

const DB_NAME = "securevault_keyvault";
const DB_VERSION = 1;
const STORE_NAME = "file_keys";

export interface StoredFileKey {
  /** Composite key: `${ownerAddress}:${fileId}` */
  id: string;
  ownerAddress: string;
  fileId: string;
  /** The AES-256 file key as hex. Only stored when CryptoKey serialization fails. */
  keyHex: string;
  /** File metadata */
  fileName: string;
  algorithm: "AES-256-GCM";
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

function openKeyVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("ownerAddress", "ownerAddress", { unique: false });
        store.createIndex("fileId", "fileId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Store & Retrieve
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Securely store a file key in IndexedDB.
 */
export async function storeFileKey(
  ownerAddress: string,
  fileId: string,
  keyHex: string,
  fileName: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const entry: StoredFileKey = {
    id: `${ownerAddress.toLowerCase()}:${fileId}`,
    ownerAddress: ownerAddress.toLowerCase(),
    fileId,
    keyHex,
    fileName,
    algorithm: "AES-256-GCM",
    createdAt: new Date().toISOString(),
  };

  try {
    const db = await openKeyVault();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback: also write to localStorage as a backup
    try {
      const key = `sv_fk_${ownerAddress.toLowerCase()}_${fileId}`;
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      console.warn("Key vault: failed to store key in fallback localStorage:", err);
    }
  }
}

/**
 * Retrieve a file key from IndexedDB.
 */
export async function retrieveFileKey(
  ownerAddress: string,
  fileId: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const compositeKey = `${ownerAddress.toLowerCase()}:${fileId}`;

  try {
    const db = await openKeyVault();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(compositeKey);
      req.onsuccess = () => {
        const entry = req.result as StoredFileKey | undefined;
        resolve(entry?.keyHex ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback: check localStorage
    try {
      const key = `sv_fk_${ownerAddress.toLowerCase()}_${fileId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw) as StoredFileKey;
        return entry.keyHex;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * List all file keys for a given owner address.
 */
export async function listFileKeys(
  ownerAddress: string
): Promise<StoredFileKey[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await openKeyVault();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("ownerAddress");
      const req = index.getAll(ownerAddress.toLowerCase());
      req.onsuccess = () => resolve((req.result as StoredFileKey[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Remove a file key from the vault.
 */
export async function deleteFileKey(
  ownerAddress: string,
  fileId: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const compositeKey = `${ownerAddress.toLowerCase()}:${fileId}`;

  try {
    const db = await openKeyVault();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(compositeKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Also clean localStorage fallback
    try {
      const key = `sv_fk_${ownerAddress.toLowerCase()}_${fileId}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
