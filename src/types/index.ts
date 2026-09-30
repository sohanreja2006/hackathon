/**
 * CYBER-10 Core Type Definitions
 * Phase 3: Client-Side AES-256-GCM File Encryption
 */

export type FileSecurityStatus = 
  | "encrypted_aes256"
  | "pinned_ipfs"
  | "pending_encryption"
  | "shared_access";

export interface MockSecureFile {
  id: string;
  name: string;
  originalName: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  status: FileSecurityStatus;
  statusLabel: string;
  encryptionAlgorithm: "AES-GCM-256" | "ChaCha20-Poly1305";
  cid?: string; // Phase 4: IPFS CID hash
  createdAt: string;
  updatedAt: string;
  sharedCount: number;
  tags: string[];
}

export interface StorageMetric {
  totalFiles: number;
  encryptedFiles: number;
  usedBytes: number;
  maxAllocatedBytes: number;
  activeShares: number;
  encryptionIntegrityScore: number; // e.g. 100%
}

export interface SecurityEventLog {
  id: string;
  event: string;
  category: "auth" | "crypto" | "storage" | "access";
  timestamp: string;
  severity: "info" | "success" | "warning";
  details: string;
}

/**
 * Phase 2 Cryptographic Session Types (EIP-4361 / SIWE)
 */
export interface SiweAuthSession {
  authenticated: boolean;
  address?: `0x${string}`;
  chainId?: number;
  expiresAt?: number;
  error?: string;
}

export interface NonceResponse {
  nonce: string;
  issuedAt: string;
  error?: string;
}

export interface VerifyAuthResponse {
  success: boolean;
  address?: `0x${string}`;
  chainId?: number;
  expiresAt?: number;
  error?: string;
}
