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
  publicEncryptionKey?: string;
  publicKeyFingerprint?: string;
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

export interface KeyAgreementMetadata {
  ephemeralPublicKey: string; // X25519 ephemeral public key hex
  iv: string;                 // AES-256-GCM IV hex
  algorithm: "X25519-HKDF-SHA256-AES256GCM";
}

export interface PayloadShare {
  id: string;
  shareId?: string;
  shareCode: string; // e.g. SV-9X4K-7P2M-Q81D
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ownerWallet: string;
  manifestCID: string;

  // E2EE fields
  recipientUserId?: string; // Designated recipient wallet address or user ID
  recipientPublicKeyFingerprint?: string; // 7A91 42D8 C31F...
  encryptedFileKey?: string; // Asymmetric AES-GCM wrapped key envelope (hex)
  keyAgreementMetadata?: KeyAgreementMetadata;

  // Quick Share mode
  isQuickShare?: boolean;
  quickShareEnvelope?: string;

  encryptionAlgorithm: "AES-256-GCM";
  integrityAlgorithm: "SHA-256";
  expiresAt: string | null; // ISO date string or null for never
  maxDownloads: number | null; // null for unlimited
  downloadCount: number;
  oneTime: boolean;
  passwordProtected: boolean;
  passwordHash?: string; // SHA-256 hash
  burnAfterReading?: boolean; // Self-destruct enabled
  burnDurationSeconds?: number; // Countdown seconds after first decryption (e.g. 60, 300)
  status: ShareStatus;
  createdAt: string;
  lastAccessedAt?: string;
}

export type ActivityEventType =
  | "wallet_authenticated"
  | "encryption_started"
  | "encryption_completed"
  | "upload_started"
  | "upload_paused"
  | "upload_resumed"
  | "upload_completed"
  | "integrity_verified"
  | "integrity_failed"
  | "file_downloaded"
  | "file_deleted"
  | "share_created"
  | "recipient_authenticated"
  | "share_accessed"
  | "share_revoked"
  | "share_burned"
  | "share_expired"
  | "share_limit_reached"
  | "decryption_started"
  | "decryption_completed"
  | "key_registered"
  | "key_rotation"
  | "tamper_detected";

export interface PayloadActivityLog {
  id: string;
  walletAddress: string;
  eventType: ActivityEventType;
  /** Human-readable description — no sensitive data */
  description: string;
  /** Optional structured metadata (no private keys, no AES keys) */
  metadata?: Record<string, string | number | boolean | null>;
  timestamp: string;
}
