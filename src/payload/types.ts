/**
 * SecureVault — Payload CMS Schema & Collection Types
 *
 * Defines the data contracts for Drive-style encrypted file management:
 * 1. UsersCollection
 * 2. FilesCollection
 * 3. ChunksCollection
 * 4. ManifestsCollection
 */

export interface PayloadUser {
  id: string;
  walletAddress: string;
  network?: string;
  createdAt: string;
  lastAuthenticatedAt: string;
}

export type FileUploadStatus =
  | "pending"
  | "encrypting"
  | "uploading"
  | "paused"
  | "verifying"
  | "completed"
  | "failed";

export type FileIntegrityStatus = "pending" | "verified" | "failed";

export interface PayloadFile {
  id: string;
  ownerWallet: string;
  originalName: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  encryptionAlgorithm: "AES-256-GCM";
  integrityAlgorithm: "SHA-256";
  manifestCID?: string;
  uploadStatus: FileUploadStatus;
  integrityStatus: FileIntegrityStatus;
  logicalPath: string; // e.g. /vault/{walletAddress}/{fileId}/
  keyHex?: string; // Stored only in local browser session/client cache, never exposed publicly
  wrappedKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChunkUploadStatus = "pending" | "uploaded" | "verified" | "failed";

export interface PayloadChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  chunkSize: number;
  encryptedSize: number;
  iv: string; // hex
  hash: string; // SHA-256 hex
  cid: string; // IPFS CID
  status: ChunkUploadStatus;
  uploadedAt: string;
}

export interface ManifestChunkItem {
  index: number;
  cid: string;
  hash: string;
  iv?: string;
  size?: number;
}

export interface PayloadManifest {
  id: string;
  fileId: string;
  manifestCID: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  encryption: "AES-256-GCM";
  integrity: "SHA-256";
  chunks: ManifestChunkItem[];
  createdAt: string;
}

export type ShareStatus = "active" | "expired" | "revoked" | "download-limit-reached";
export type ShareExpirationOption = "never" | "1h" | "24h" | "7d" | "30d";
export type ShareDownloadLimitOption = "1" | "5" | "10" | "unlimited";

export interface PayloadShare {
  id: string;
  shareCode: string; // e.g. SV-9X4K-7P2M-Q81D
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ownerWallet: string;
  manifestCID: string;
  encryptionAlgorithm: "AES-256-GCM";
  integrityAlgorithm: "SHA-256";
  expiresAt: string | null; // ISO date string or null for never
  maxDownloads: number | null; // null for unlimited
  downloadCount: number;
  oneTime: boolean;
  passwordProtected: boolean;
  passwordHash?: string; // SHA-256 hash
  status: ShareStatus;
  createdAt: string;
  lastAccessedAt?: string;
}

