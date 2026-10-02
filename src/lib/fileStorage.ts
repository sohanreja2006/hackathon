/**
 * CYBER-10 Sovereign File Registry & Peer Sharing Storage
 *
 * Implements client-side, wallet-scoped persistent storage for:
 * - FR-4: Decentralized File Directory (listing user files, sizes, CIDs, timestamps)
 * - FR-6: Peer-to-Peer Encrypted File Sharing records
 *
 * SECURITY MODEL:
 * - Records are strictly scoped to the user's wallet address.
 * - Ciphertexts reside on public IPFS content-addressed by CID.
 * - AES-256 keys remain in local storage on the client device only;
 *   keys are never transmitted to any centralized database or server.
 */

export interface StoredEncryptedFile {
  id: string;
  cid: string;
  fileName: string;
  originalName: string;
  extension: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  ownerAddress: string;
  keyHex: string;
  /**
   * AES-GCM wrapped copy of keyHex encrypted by the VaultX master KEK.
   * Format: "<iv-hex>:<ciphertext-hex>"  (set only when VaultX wallet was active at upload time)
   */
  wrappedKey?: string;
  algorithm: "AES-256-GCM";
  sharedWith: string[]; // List of recipient addresses
  totalChunks?: number;
  chunkSize?: number;
  manifestCID?: string;
  logicalPath?: string;
  uploadStatus?: string;
  integrityStatus?: string;
  ivHex?: string;
  chunks?: Array<{
    index: number;
    cid: string;
    hash: string;
    iv?: string;
    size?: number;
  }>;
}

export interface SharedFileRecord {
  id: string;
  cid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sharedAt: string;
  ownerAddress: string;
  recipientAddress: string;
  encryptedKeyForRecipient: string;
  salt: string;
  accessNote?: string;
}

const STORAGE_KEY_PREFIX = "cyber10_vault_files_";
const SHARED_STORAGE_KEY = "cyber10_shared_registry_v1";

/**
 * Get all files uploaded by a specific wallet address
 */
export function getUserFiles(walletAddress?: string | null): StoredEncryptedFile[] {
  if (!walletAddress || typeof window === "undefined") return [];
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as StoredEncryptedFile[];
  } catch (err) {
    console.error("Failed to read user files from localStorage", err);
    return [];
  }
}

/**
 * Retrieve all files stored in this browser session.
 * Checks known owners (MetaMask address, VaultX identity, etc.) AND
 * scans all localStorage keys matching STORAGE_KEY_PREFIX.
 * This guarantees that files uploaded under VaultX or MetaMask NEVER vanish
 * from recent files history when switching or navigating.
 */
export function getAllVaultFiles(knownOwners?: (string | null | undefined)[]): StoredEncryptedFile[] {
  if (typeof window === "undefined") return [];
  try {
    const fileMap = new Map<string, StoredEncryptedFile>();

    // 1. Check known owner keys explicitly
    const cleanOwners = (knownOwners || []).filter(Boolean) as string[];
    for (const owner of cleanOwners) {
      const files = getUserFiles(owner);
      for (const f of files) {
        if (f.cid) fileMap.set(f.cid, f);
      }
    }

    // 2. Scan all localStorage keys with prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as StoredEncryptedFile[];
            if (Array.isArray(parsed)) {
              for (const f of parsed) {
                if (f.cid && !fileMap.has(f.cid)) {
                  fileMap.set(f.cid, f);
                }
              }
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    // Return sorted newest first
    return Array.from(fileMap.values()).sort((a, b) => {
      const timeA = new Date(a.uploadedAt || 0).getTime();
      const timeB = new Date(b.uploadedAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.error("Failed to retrieve vault files", err);
    return [];
  }
}

/**
 * Save an uploaded file record under the user's wallet address
 */
export function saveUserFile(file: StoredEncryptedFile): void {
  if (typeof window === "undefined" || !file.ownerAddress) return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${file.ownerAddress.toLowerCase()}`;
    const existing = getUserFiles(file.ownerAddress);
    // Deduplicate by CID or id
    const filtered = existing.filter((f) => f.cid !== file.cid && f.id !== file.id);
    const updated = [file, ...filtered];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save user file record", err);
  }
}

/**
 * Delete a file record from the user's directory
 */
export function deleteUserFile(walletAddress: string, fileId: string): void {
  if (typeof window === "undefined" || !walletAddress) return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
    const existing = getUserFiles(walletAddress);
    const updated = existing.filter((f) => f.id !== fileId && f.cid !== fileId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to delete user file", err);
  }
}

/**
 * Delete a file record across all local storage registry prefixes
 */
export function deleteVaultFile(fileIdOrCid: string): void {
  if (typeof window === "undefined" || !fileIdOrCid) return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as StoredEncryptedFile[];
            if (Array.isArray(parsed)) {
              const updated = parsed.filter(
                (f) => f.id !== fileIdOrCid && f.cid !== fileIdOrCid
              );
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch {
          // ignore parse error
        }
      }
    }
  } catch (err) {
    console.error("Failed to delete vault file across stores", err);
  }
}

/**
 * Get all files that have been shared with a specific wallet address
 */
export function getSharedWithMeFiles(walletAddress?: string | null): SharedFileRecord[] {
  if (!walletAddress || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHARED_STORAGE_KEY);
    if (!raw) return [];
    const allShares = JSON.parse(raw) as SharedFileRecord[];
    const normalized = walletAddress.toLowerCase();
    return allShares.filter((s) => s.recipientAddress.toLowerCase() === normalized);
  } catch (err) {
    console.error("Failed to read shared files", err);
    return [];
  }
}

/**
 * Record a peer-to-peer file share grant
 */
export function recordFileShare(share: SharedFileRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SHARED_STORAGE_KEY);
    const allShares: SharedFileRecord[] = raw ? JSON.parse(raw) : [];
    // Deduplicate if already shared with this recipient for this CID
    const filtered = allShares.filter(
      (s) =>
        !(
          s.cid === share.cid &&
          s.recipientAddress.toLowerCase() === share.recipientAddress.toLowerCase()
        )
    );
    const updated = [share, ...filtered];
    localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(updated));

    // Also update the owner's file record sharedWith list
    const userFiles = getUserFiles(share.ownerAddress);
    const targetFile = userFiles.find((f) => f.cid === share.cid);
    if (targetFile) {
      const currentShares = new Set(targetFile.sharedWith || []);
      currentShares.add(share.recipientAddress.toLowerCase());
      targetFile.sharedWith = Array.from(currentShares);
      saveUserFile(targetFile);
    }
  } catch (err) {
    console.error("Failed to record file share", err);
  }
}
