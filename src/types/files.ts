/**
 * CYBER-10 Phase 4 — File Metadata Types
 *
 * These types define the shape of encrypted file records.
 * Phase 5 will persist these to Supabase.
 *
 * SECURITY NOTE:
 * The AES encryption key MUST NOT appear in any of these records.
 * It is the user's sole responsibility to preserve their key.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 Upload Types (in-memory, returned by the upload endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Response from POST /api/files/upload on success.
 */
export interface UploadSuccessResponse {
  success: true;
  /** IPFS Content Identifier of the encrypted file */
  cid: string;
  /** Pinata file ID */
  fileId: string;
  /** Encrypted file size in bytes */
  size: number;
  /** ISO timestamp of upload */
  uploadedAt: string;
}

export interface UploadErrorResponse {
  success: false;
  error: string;
}

export type UploadApiResponse = UploadSuccessResponse | UploadErrorResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 Prep — File Record Interface (for Supabase in Phase 5)
//
// This interface defines what will be stored in the database.
// Note: encryption_key is NOT included — keys stay with the user.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single encrypted file record stored in the database.
 *
 * Phase 5 will create a `encrypted_files` table matching this shape.
 * The `encryption_key` is intentionally absent — it is never stored server-side.
 */
export interface EncryptedFileRecord {
  /** Auto-generated UUID primary key */
  id: string;
  /** Wallet address of the file owner (lowercase) */
  user_id: string;
  /** IPFS CID of the encrypted file */
  cid: string;
  /** Original plaintext filename (for display) */
  filename: string;
  /** Original MIME type (for proper download restoration) */
  mime_type: string;
  /** Original file size in bytes */
  original_size: number;
  /** Encrypted bundle size in bytes */
  encrypted_size: number;
  /** Encryption algorithm identifier */
  algorithm: "AES-256-GCM";
  /** ISO timestamp of when the file was uploaded */
  created_at: string;
  /**
   * DO NOT ADD: encryption_key
   * The AES key is NEVER stored server-side.
   */
}

// ─────────────────────────────────────────────────────────────────────────────
// UI State Types for the Vault Upload Flow
// ─────────────────────────────────────────────────────────────────────────────

export type VaultUploadStage =
  | "idle"
  | "selected"
  | "encrypting"
  | "encrypted"
  | "uploading"
  | "uploaded"
  | "error";

export interface VaultUploadState {
  stage: VaultUploadStage;
  /** The file selected by the user */
  selectedFile: File | null;
  /** Hex-encoded AES-256 encryption key — shown once to the user */
  keyHex: string | null;
  /** IPFS CID returned after successful upload */
  cid: string | null;
  /** Original file size in bytes */
  originalSizeBytes: number | null;
  /** Encrypted file size in bytes */
  encryptedSizeBytes: number | null;
  /** Timestamp of upload */
  uploadedAt: string | null;
  /** Human-readable error message (no secrets) */
  errorMessage: string | null;
}
