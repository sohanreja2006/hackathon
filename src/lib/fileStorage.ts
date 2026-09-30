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
  algorithm: "AES-256-GCM";
  sharedWith: string[]; // List of recipient addresses
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
