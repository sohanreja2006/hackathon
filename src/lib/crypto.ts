/**
 * CYBER-10 Client-Side AES-256-GCM Encryption Engine
 * Phase 3: In-Browser File Encryption
 *
 * SECURITY GUARANTEES:
 * - All operations are performed locally in the browser via the Web Crypto API.
 * - The plaintext file NEVER leaves the browser.
 * - AES-256-GCM provides authenticated encryption with integrity verification.
 * - Each encryption generates a unique 256-bit key + 96-bit IV (never reused).
 * - Keys are ephemeral: stored in memory only and exportable for future decryption.
 *
 * BUNDLE FORMAT (binary blob written to .cyber10enc):
 *   [4 bytes magic]   = 0x43 0x59 0x42 0x52  ("CYBR")
 *   [1 byte version]  = 0x01
 *   [12 bytes IV]     = AES-GCM 96-bit nonce
 *   [4 bytes nameLen] = uint32 big-endian: byte-length of original filename
 *   [nameLen bytes]   = UTF-8 original filename
 *   [4 bytes mimeLen] = uint32 big-endian: byte-length of MIME type
 *   [mimeLen bytes]   = UTF-8 MIME type
 *   [remaining bytes] = AES-256-GCM ciphertext + 128-bit GCM auth tag (appended by Web Crypto)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EncryptedFileBundle {
  /** The raw encrypted blob (.cyber10enc) */
  encryptedBlob: Blob;
  /** Hex-encoded 256-bit AES key — must be stored securely by caller */
  keyHex: string;
  /** Original plaintext filename */
  originalName: string;
  /** Original file MIME type */
  mimeType: string;
  /** Size of the original file in bytes */
  originalSizeBytes: number;
  /** Size of the resulting encrypted bundle in bytes */
  encryptedSizeBytes: number;
  /** Timestamp of encryption (ISO 8601) */
  encryptedAt: string;
  /** Suggested download filename */
  downloadName: string;
}

export interface DecryptedFileBundle {
  /** Raw decrypted plaintext bytes */
  plainBlob: Blob;
  /** Original filename recovered from bundle header */
  originalName: string;
  /** Original MIME type recovered from bundle header */
  mimeType: string;
}

export interface CryptoProgress {
  stage: "reading" | "encrypting" | "decrypting" | "done" | "error";
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Magic bytes & constants
// ─────────────────────────────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x43, 0x59, 0x42, 0x52]); // "CYBR"
const VERSION = 0x01;
const IV_LENGTH = 12;    // 96-bit GCM nonce
const KEY_BITS = 256;    // AES-256

// ─────────────────────────────────────────────────────────────────────────────
// Key utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a new cryptographically random AES-256-GCM key */
export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_BITS },
    true, // extractable — we export it so the user can save it
    ["encrypt", "decrypt"]
  );
}

/** Export an AES CryptoKey to a lowercase hex string */
export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Import a hex string back to an AES-256-GCM CryptoKey */
export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
  if (hex.length !== 64) {
    throw new Error(
      `Invalid key length: expected 64 hex chars (256 bits), got ${hex.length}`
    );
  }
  const raw = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: KEY_BITS },
    false, // not extractable after import
    ["decrypt"]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bundle header encode / decode helpers
// ─────────────────────────────────────────────────────────────────────────────

function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function writeUint32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, value, false); // big-endian
  return buf;
}

function readUint32BE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset);
  return view.getUint32(offset, false);
}

/**
 * Build the plaintext bundle header:
 * [magic 4B][version 1B][iv 12B][nameLen 4B][name][mimeLen 4B][mime]
 */
function buildHeader(iv: Uint8Array, filename: string, mimeType: string): Uint8Array {
  const nameBytes = encodeString(filename);
  const mimeBytes = encodeString(mimeType);

  const totalLen =
    MAGIC.length + 1 + IV_LENGTH +
    4 + nameBytes.length +
    4 + mimeBytes.length;

  const header = new Uint8Array(totalLen);
  let pos = 0;

  header.set(MAGIC, pos); pos += MAGIC.length;
  header[pos++] = VERSION;
  header.set(iv, pos); pos += IV_LENGTH;
  header.set(writeUint32BE(nameBytes.length), pos); pos += 4;
  header.set(nameBytes, pos); pos += nameBytes.length;
  header.set(writeUint32BE(mimeBytes.length), pos); pos += 4;
  header.set(mimeBytes, pos);

  return header;
}

/**
 * Parse the bundle header. Returns IV, original name, mime type, and
 * the byte offset at which the ciphertext starts.
 */
function parseHeader(buf: Uint8Array): {
  iv: Uint8Array;
  originalName: string;
  mimeType: string;
  ciphertextOffset: number;
} {
  let pos = 0;

  // Validate magic
  for (let i = 0; i < MAGIC.length; i++) {
    if (buf[pos + i] !== MAGIC[i]) {
      throw new Error(
        "Invalid file format: missing CYBR magic bytes. Ensure this is a .cyber10enc file."
      );
    }
  }
  pos += MAGIC.length;

  // Validate version
  const version = buf[pos++];
  if (version !== VERSION) {
    throw new Error(
      `Unsupported bundle version: ${version}. Only version ${VERSION} is supported.`
    );
  }

  // Read IV
  const iv = new Uint8Array(buf.slice(pos, pos + IV_LENGTH));
  pos += IV_LENGTH;

  // Read original filename
  const nameLen = readUint32BE(buf, pos); pos += 4;
  const originalName = new TextDecoder().decode(buf.slice(pos, pos + nameLen));
  pos += nameLen;

  // Read MIME type
  const mimeLen = readUint32BE(buf, pos); pos += 4;
  const mimeType = new TextDecoder().decode(buf.slice(pos, pos + mimeLen));
  pos += mimeLen;

  return { iv, originalName, mimeType, ciphertextOffset: pos };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a file using AES-256-GCM.
 *
 * Returns an EncryptedFileBundle containing:
 *  - The encrypted blob (ready to download)
 *  - The hex key (user must store this to decrypt later)
 *
 * The plaintext file is read, encrypted entirely in the browser, and the
 * resulting bundle is a .cyber10enc binary file that embeds all metadata
 * needed for decryption (IV, filename, MIME type).
 */
export async function encryptFile(
  file: File,
  onProgress?: (p: CryptoProgress) => void
): Promise<EncryptedFileBundle> {
  onProgress?.({ stage: "reading", message: "Reading file into browser memory..." });

  // Read file as ArrayBuffer
  const plaintext = await file.arrayBuffer();

  onProgress?.({ stage: "encrypting", message: "Generating AES-256-GCM key..." });

  // Generate unique ephemeral key & IV
  const key = await generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  onProgress?.({ stage: "encrypting", message: "Encrypting with AES-256-GCM..." });

  // Perform authenticated encryption
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Build binary bundle: header + ciphertext
  const header = buildHeader(iv, file.name, file.type || "application/octet-stream");
  const bundle = new Uint8Array(header.length + ciphertext.byteLength);
  bundle.set(header, 0);
  bundle.set(new Uint8Array(ciphertext), header.length);

  const keyHex = await exportKeyToHex(key);
  const downloadName = `${file.name}.cyber10enc`;

  const encryptedBlob = new Blob([bundle], { type: "application/octet-stream" });

  onProgress?.({ stage: "done", message: "Encryption complete." });

  return {
    encryptedBlob,
    keyHex,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    originalSizeBytes: file.size,
    encryptedSizeBytes: bundle.byteLength,
    encryptedAt: new Date().toISOString(),
    downloadName,
  };
}

/**
 * Decrypt a .cyber10enc bundle using the provided hex key.
 *
 * Validates the bundle magic, parses the header, decrypts with AES-256-GCM
 * (which also verifies the GCM auth tag — any tampering causes an error).
 */
export async function decryptFile(
  encryptedFile: File,
  keyHex: string,
  onProgress?: (p: CryptoProgress) => void
): Promise<DecryptedFileBundle> {
  onProgress?.({ stage: "reading", message: "Reading encrypted bundle..." });

  const rawBuffer = await encryptedFile.arrayBuffer();
  const buf = new Uint8Array(rawBuffer);

  onProgress?.({ stage: "decrypting", message: "Parsing bundle header..." });

  const { iv, originalName, mimeType, ciphertextOffset } = parseHeader(buf);
  // Copy into plain ArrayBuffer-backed Uint8Array to satisfy Web Crypto API types
  const ciphertext = new Uint8Array(buf.slice(ciphertextOffset));

  onProgress?.({ stage: "decrypting", message: "Importing key..." });
  const key = await importKeyFromHex(keyHex.trim());

  onProgress?.({ stage: "decrypting", message: "Decrypting & verifying integrity..." });

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer> },
      key,
      ciphertext
    );
  } catch {
    throw new Error(
      "Decryption failed. The key may be incorrect, or the file has been tampered with (GCM auth tag mismatch)."
    );
  }

  onProgress?.({ stage: "done", message: "Decryption complete." });

  return {
    plainBlob: new Blob([plaintext], { type: mimeType }),
    originalName,
    mimeType,
  };
}

/** Trigger a browser download for any Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}

/** Format bytes to a human-readable string */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
