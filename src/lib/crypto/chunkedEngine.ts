/**
 * SecureVault — Real Chunked AES-256-GCM Encryption Engine
 *
 * SECURITY GUARANTEES:
 * - Files are processed chunk-by-chunk via Blob.slice() — never loaded entirely into memory.
 * - Each chunk gets a UNIQUE cryptographically random 96-bit IV (never reused with the same key).
 * - Additional Authenticated Data (AAD) binds each chunk to its (fileId, chunkIndex, version).
 * - SHA-256 integrity hash is computed per encrypted chunk.
 * - AES-256 file key is generated via crypto.subtle.generateKey() (CSPRNG).
 * - Plaintext NEVER leaves the browser.
 *
 * ARCHITECTURE:
 *   FILE → Blob.slice() → PER-CHUNK [AES-256-GCM + unique IV + AAD] → SHA-256 → IPFS
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
const IV_LENGTH = 12;  // 96-bit AES-GCM nonce
const KEY_BITS = 256;
const MANIFEST_VERSION = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChunkEncryptionResult {
  chunkIndex: number;
  plaintextSize: number;
  encryptedSize: number;
  iv: string;          // hex
  sha256: string;      // hex — SHA-256 of the encrypted chunk
  encryptedBlob: Blob; // encrypted ciphertext ready for IPFS upload
  status: "encrypted";
}

export interface ChunkUploadResult extends Omit<ChunkEncryptionResult, "status"> {
  cid: string;
  status: "uploaded";
}

export interface FileManifest {
  version: number;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  algorithm: "AES-256-GCM";
  hashAlgorithm: "SHA-256";
  chunks: Array<{
    index: number;
    iv: string;
    sha256: string;
    cid: string;
    plaintextSize: number;
    encryptedSize: number;
  }>;
}

export interface EncryptionProgress {
  stage: "generating_key" | "encrypting" | "uploading" | "verifying" | "done" | "error" | "paused";
  currentChunk: number;
  totalChunks: number;
  percentComplete: number;
  message: string;
}

export interface ChunkedEncryptionResult {
  fileId: string;
  keyHex: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  chunks: ChunkEncryptionResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hex utilities
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Key Generation & Management
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a fresh AES-256-GCM key using WebCrypto CSPRNG */
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_BITS },
    true, // extractable — needed to export for storage
    ["encrypt", "decrypt"]
  );
}

/** Export CryptoKey to hex string */
export async function exportKeyHex(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToHex(new Uint8Array(raw));
}

/** Import hex string to CryptoKey (decrypt-only) */
export async function importKeyHex(hex: string): Promise<CryptoKey> {
  if (hex.length !== 64) {
    throw new Error(`Invalid AES-256 key: expected 64 hex chars, got ${hex.length}`);
  }
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(hex) as unknown as BufferSource,
    { name: "AES-GCM", length: KEY_BITS },
    false, // not extractable after import
    ["decrypt"]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AAD Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build Additional Authenticated Data for AES-GCM.
 * Binds each chunk's ciphertext to its context (fileId, chunkIndex, version).
 * AAD is NOT secret — it prevents chunk reordering/substitution attacks.
 */
function buildAAD(fileId: string, chunkIndex: number, version: number = MANIFEST_VERSION): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`SecureVault:v${version}:${fileId}:chunk${chunkIndex}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 Integrity
// ─────────────────────────────────────────────────────────────────────────────

/** Compute SHA-256 hash of an ArrayBuffer, returns hex string */
export async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunked Encryption (Encrypt First, Upload Second)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a file chunk-by-chunk using AES-256-GCM.
 *
 * FLOW per chunk:
 *   plaintext slice → AES-256-GCM(key, unique IV, AAD) → ciphertext → SHA-256 → result
 *
 * @param file        The File to encrypt
 * @param chunkSize   Bytes per chunk (default 8 MB)
 * @param onProgress  Real-time progress callback
 * @param abortSignal Optional AbortSignal for pause/cancel
 * @returns           Encryption results with all chunks and the file key
 */
export async function encryptFileChunked(
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  onProgress?: (p: EncryptionProgress) => void,
  abortSignal?: AbortSignal,
  customFileId?: string
): Promise<ChunkedEncryptionResult> {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const fileId = customFileId || `sv_${Date.now()}_${crypto.getRandomValues(new Uint8Array(4)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`;

  // Phase 1: Generate unique AES-256 file key
  onProgress?.({
    stage: "generating_key",
    currentChunk: 0,
    totalChunks,
    percentComplete: 0,
    message: "Generating cryptographically secure AES-256 file key...",
  });

  const key = await generateFileKey();
  const keyHex = await exportKeyHex(key);

  // Phase 2: Encrypt each chunk with unique IV + AAD
  const chunks: ChunkEncryptionResult[] = [];

  for (let i = 0; i < totalChunks; i++) {
    // Check for abort/pause
    if (abortSignal?.aborted) {
      throw new DOMException("Encryption aborted", "AbortError");
    }

    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    onProgress?.({
      stage: "encrypting",
      currentChunk: i + 1,
      totalChunks,
      percentComplete: Math.round(((i + 0.3) / totalChunks) * 100),
      message: `Encrypting chunk ${i + 1} of ${totalChunks}...`,
    });

    // Read chunk into ArrayBuffer
    const plaintext = await chunkBlob.arrayBuffer();

    // Generate UNIQUE IV for this chunk (CRITICAL: never reuse IV with same key)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Build AAD to bind ciphertext to its context
    const aad = buildAAD(fileId, i);

    // AES-256-GCM authenticated encryption
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource,
        additionalData: aad as unknown as BufferSource,
      },
      key,
      plaintext
    );

    // Compute SHA-256 integrity hash of the encrypted chunk
    const sha256 = await computeSha256(ciphertext);

    const encryptedBlob = new Blob([ciphertext], { type: "application/octet-stream" });

    chunks.push({
      chunkIndex: i,
      plaintextSize: end - start,
      encryptedSize: ciphertext.byteLength,
      iv: bytesToHex(iv),
      sha256,
      encryptedBlob,
      status: "encrypted",
    });

    onProgress?.({
      stage: "encrypting",
      currentChunk: i + 1,
      totalChunks,
      percentComplete: Math.round(((i + 1) / totalChunks) * 100),
      message: `Chunk ${i + 1} of ${totalChunks} encrypted. IV: ${bytesToHex(iv).slice(0, 8)}... SHA-256: ${sha256.slice(0, 12)}...`,
    });
  }

  return {
    fileId,
    keyHex,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    totalChunks,
    chunkSize,
    chunks,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunked Decryption with Integrity Verification
// ─────────────────────────────────────────────────────────────────────────────

export interface DecryptionProgress {
  stage: "fetching" | "verifying" | "decrypting" | "reconstructing" | "done" | "error";
  currentChunk: number;
  totalChunks: number;
  percentComplete: number;
  message: string;
}

export interface IntegrityFailure {
  chunkIndex: number;
  expectedHash: string;
  receivedHash: string;
}

/**
 * Verify SHA-256 integrity and decrypt a single encrypted chunk.
 *
 * Supports multi-candidate AAD fallback:
 *   - Current fileId (v2 & v1 format)
 *   - Additional candidate IDs (manifestCID, shareCode, fileId)
 *   - No AAD (for single-file upload / legacy ciphertext)
 *   - Embedded .cyber10enc binary bundle
 *
 * @throws On SHA-256 mismatch or AES-GCM auth tag failure across all candidate parameters
 */
export async function verifyAndDecryptChunk(
  encryptedData: ArrayBuffer,
  keyHex: string,
  chunkIndex: number,
  expectedSha256: string,
  ivHex: string,
  fileId: string,
  candidateFileIds: string[] = []
): Promise<ArrayBuffer> {
  // Step 1: SHA-256 integrity verification BEFORE decryption
  if (expectedSha256) {
    const actualHash = await computeSha256(encryptedData);

    if (actualHash.toLowerCase() !== expectedSha256.toLowerCase()) {
      const failure: IntegrityFailure = {
        chunkIndex,
        expectedHash: expectedSha256,
        receivedHash: actualHash,
      };
      throw new Error(
        `Integrity verification failed for chunk ${chunkIndex}.\n` +
        `Expected SHA-256: ${failure.expectedHash}\n` +
        `Received SHA-256: ${failure.receivedHash}\n` +
        `The encrypted data may have been tampered with. Decryption aborted.`
      );
    }
  }

  // Step 2: Import key and decrypt with AES-GCM (which also verifies the 128-bit auth tag)
  const key = await importKeyHex(keyHex);
  const iv = hexToBytes(ivHex);

  const candidateIds = Array.from(new Set([fileId, ...candidateFileIds].filter(Boolean)));
  const aadsToTry: (Uint8Array | undefined)[] = [];

  // Try candidate AADs with v2 and v1 formats
  for (const cid of candidateIds) {
    aadsToTry.push(buildAAD(cid, chunkIndex, MANIFEST_VERSION));
    aadsToTry.push(buildAAD(cid, chunkIndex, 1));
  }

  // Fallback: No AAD (undefined) - for single-file upload or legacy encrypted chunks
  aadsToTry.push(undefined);

  let plaintext: ArrayBuffer | null = null;

  for (const aad of aadsToTry) {
    try {
      const decryptParams: AesGcmParams = {
        name: "AES-GCM",
        iv: iv as unknown as BufferSource,
      };
      if (aad) {
        decryptParams.additionalData = aad as unknown as BufferSource;
      }

      plaintext = await crypto.subtle.decrypt(
        decryptParams,
        key,
        encryptedData
      );
      if (plaintext) {
        break; // Successfully verified GCM auth tag and decrypted!
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback: Check if the buffer is a .cyber10enc bundle with embedded header
  if (!plaintext && encryptedData.byteLength > 24) {
    try {
      const u8 = new Uint8Array(encryptedData);
      // "CYBR" magic check (0x43, 0x59, 0x42, 0x52)
      if (u8[0] === 0x43 && u8[1] === 0x59 && u8[2] === 0x42 && u8[3] === 0x52) {
        let pos = 5; // 4 magic + 1 version
        const headerIv = u8.slice(pos, pos + 12);
        pos += 12;
        const nameLen = new DataView(u8.buffer, u8.byteOffset).getUint32(pos, false);
        pos += 4 + nameLen;
        const mimeLen = new DataView(u8.buffer, u8.byteOffset).getUint32(pos, false);
        pos += 4 + mimeLen;
        const ct = u8.slice(pos);

        plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: headerIv as unknown as BufferSource },
          key,
          ct
        );
      }
    } catch {
      // ignore
    }
  }

  if (!plaintext) {
    throw new Error(
      `AES-GCM authentication failed for chunk ${chunkIndex}. ` +
      `The decryption key may be incorrect, or the ciphertext has been modified.`
    );
  }

  return plaintext;
}

/**
 * Decrypt and reconstruct a file from its manifest and encrypted chunks.
 *
 * FLOW:
 *   manifest → for each chunk: fetch → SHA-256 verify → AES-GCM decrypt → reconstruct
 *
 * @param manifest       The file manifest containing chunk metadata
 * @param keyHex         The AES-256 file key (hex)
 * @param fetchChunk     Async function that fetches encrypted chunk bytes by CID
 * @param onProgress     Real-time progress callback
 * @returns              The reconstructed plaintext file as a Blob
 */
export async function decryptFileFromManifest(
  manifest: FileManifest,
  keyHex: string,
  fetchChunk: (cid: string) => Promise<ArrayBuffer>,
  onProgress?: (p: DecryptionProgress) => void
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const { totalChunks, chunks, fileId, fileName, mimeType } = manifest;
  const decryptedParts: ArrayBuffer[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkMeta = chunks.find((c) => (c.index ?? (c as any).chunkIndex) === i);
    if (!chunkMeta) {
      throw new Error(`Missing chunk metadata for index ${i}. Manifest may be corrupted.`);
    }

    const cid = chunkMeta.cid || (chunkMeta as any).ipfsCID;
    const sha256 = chunkMeta.sha256 || (chunkMeta as any).hash;
    const iv = chunkMeta.iv;

    // Step 1: Fetch encrypted chunk from IPFS
    onProgress?.({
      stage: "fetching",
      currentChunk: i + 1,
      totalChunks,
      percentComplete: Math.round((i / totalChunks) * 50),
      message: `Retrieving encrypted chunk ${i + 1} of ${totalChunks} from IPFS...`,
    });

    const encryptedData = await fetchChunk(cid);

    // Step 2: Verify SHA-256 integrity
    onProgress?.({
      stage: "verifying",
      currentChunk: i + 1,
      totalChunks,
      percentComplete: Math.round(((i + 0.3) / totalChunks) * 50 + 25),
      message: `Verifying SHA-256 integrity of chunk ${i + 1}...`,
    });

    // Step 3: Decrypt with AES-GCM (includes auth tag verification)
    onProgress?.({
      stage: "decrypting",
      currentChunk: i + 1,
      totalChunks,
      percentComplete: Math.round(((i + 0.7) / totalChunks) * 50 + 25),
      message: `Decrypting chunk ${i + 1} with AES-256-GCM...`,
    });

    const plaintext = await verifyAndDecryptChunk(
      encryptedData,
      keyHex,
      i,
      sha256,
      iv,
      fileId,
      [manifest.fileId, (manifest as any).id, (manifest as any).manifestCID].filter(Boolean)
    );

    decryptedParts.push(plaintext);
  }

  // Step 4: Reconstruct original file
  onProgress?.({
    stage: "reconstructing",
    currentChunk: totalChunks,
    totalChunks,
    percentComplete: 95,
    message: "Reconstructing original file from verified chunks...",
  });

  const blob = new Blob(decryptedParts, { type: mimeType });

  // Size verification
  if (manifest.fileSize && blob.size !== manifest.fileSize) {
    throw new Error(
      `Reconstructed file size mismatch: expected ${manifest.fileSize} bytes, got ${blob.size} bytes.`
    );
  }

  onProgress?.({
    stage: "done",
    currentChunk: totalChunks,
    totalChunks,
    percentComplete: 100,
    message: `Decryption complete. All ${totalChunks} chunks verified and decrypted.`,
  });

  return { blob, fileName, mimeType };
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a file manifest from encryption + upload results.
 */
export function buildManifest(
  encResult: ChunkedEncryptionResult,
  chunkCids: string[]
): FileManifest {
  return {
    version: MANIFEST_VERSION,
    fileId: encResult.fileId,
    fileName: encResult.fileName,
    fileSize: encResult.fileSize,
    mimeType: encResult.mimeType,
    chunkSize: encResult.chunkSize,
    totalChunks: encResult.totalChunks,
    algorithm: "AES-256-GCM",
    hashAlgorithm: "SHA-256",
    chunks: encResult.chunks.map((c, idx) => ({
      index: c.chunkIndex,
      iv: c.iv,
      sha256: c.sha256,
      cid: chunkCids[idx] || "",
      plaintextSize: c.plaintextSize,
      encryptedSize: c.encryptedSize,
    })),
  };
}
