/**
 * SecureVault — Crypto Module Barrel Export
 *
 * Public API for the real client-side encryption system.
 */

// Chunked AES-256-GCM encryption engine
export {
  encryptFileChunked,
  verifyAndDecryptChunk,
  decryptFileFromManifest,
  buildManifest,
  generateFileKey,
  exportKeyHex,
  importKeyHex,
  computeSha256,
  bytesToHex,
  hexToBytes,
  DEFAULT_CHUNK_SIZE,
  type ChunkEncryptionResult,
  type ChunkUploadResult,
  type FileManifest,
  type EncryptionProgress,
  type DecryptionProgress,
  type ChunkedEncryptionResult,
  type IntegrityFailure,
} from "./chunkedEngine";

// Secure IndexedDB key vault
export {
  storeFileKey,
  retrieveFileKey,
  listFileKeys,
  deleteFileKey,
  type StoredFileKey,
} from "./keyVault";

// Legacy and standalone crypto helpers from ../crypto
export {
  generateAesKey,
  exportKeyToHex,
  importKeyFromHex,
  encryptFile,
  decryptFile,
  downloadBlob,
  formatBytes,
  reencryptKeyForRecipient,
  decryptKeyForRecipient,
  downloadAndDecryptFromIpfs,
  type EncryptedFileBundle,
  type DecryptedFileBundle,
  type CryptoProgress,
} from "../crypto";
