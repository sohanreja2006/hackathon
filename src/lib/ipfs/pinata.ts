/**
 * CYBER-10 Phase 4 — Server-Side Pinata IPFS Upload Helper
 *
 * SECURITY:
 * - This module MUST only be imported in server-side code (API routes, Server Actions).
 * - The PINATA_JWT env var is read at call time — never at module load — so it cannot
 *   accidentally leak into a client bundle.
 * - The caller is responsible for ensuring only ciphertext (never plaintext) is passed
 *   to uploadEncryptedFile().
 *
 * Uses the Pinata Files API v3:
 *   POST https://uploads.pinata.cloud/v3/files
 *   Authorization: Bearer {PINATA_JWT}
 */

export const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";
export const MAX_ENCRYPTED_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PinataUploadOptions {
  /** The encrypted binary data (ciphertext only — NEVER plaintext) */
  encryptedData: Buffer | Uint8Array;
  /** Original filename (used for display in Pinata dashboard — NOT the plaintext content) */
  originalName: string;
  /** Original MIME type (metadata only — does NOT indicate the encrypted content type) */
  originalMimeType: string;
  /** Original plaintext size (bytes) — for metadata only */
  originalSizeBytes: number;
  /** Wallet address of the authenticated uploader */
  ownerAddress: string;
}

export interface PinataUploadResult {
  /** IPFS Content Identifier of the encrypted file */
  cid: string;
  /** Pinata file ID */
  fileId: string;
  /** Encrypted file size in bytes as confirmed by Pinata */
  size: number;
  /** ISO timestamp from Pinata */
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt || jwt.trim() === "") {
    throw new Error(
      "PINATA_JWT environment variable is not configured. " +
      "Set it in .env.local from https://app.pinata.cloud/developers/api-keys"
    );
  }
  return jwt.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a ciphertext (AES-256-GCM encrypted) blob to Pinata IPFS.
 *
 * CRITICAL INVARIANT: The caller guarantees `encryptedData` contains
 * ONLY ciphertext — never plaintext. This function does not validate content,
 * it only enforces size limits.
 *
 * Safe Pinata metadata is attached:
 *   - encrypted: "true"
 *   - algorithm: "AES-256-GCM"
 *   - originalName: original filename (for display — not the content)
 *   - version: "1"
 *
 * The AES encryption key is NEVER included in metadata.
 */
export async function uploadEncryptedFileToPinata(
  opts: PinataUploadOptions
): Promise<PinataUploadResult> {
  const { encryptedData, originalName, originalMimeType, originalSizeBytes, ownerAddress } = opts;

  // Enforce size limit server-side
  if (encryptedData.byteLength > MAX_ENCRYPTED_SIZE_BYTES) {
    throw new Error(
      `Encrypted file exceeds the 50 MB limit (${encryptedData.byteLength} bytes).`
    );
  }

  const jwt = getPinataJwt();

  // Build multipart form: encrypted file + safe metadata
  const form = new FormData();

  // Copy encrypted data into a fresh Uint8Array<ArrayBuffer> to satisfy TypeScript
  // strict BlobPart typing — Buffer<ArrayBufferLike> is not assignable to BlobPart.
  const safeBuffer = new Uint8Array(
    encryptedData.buffer instanceof ArrayBuffer
      ? encryptedData.buffer
      : Buffer.from(encryptedData).buffer
  );
  const encryptedBlob = new Blob([safeBuffer], {
    type: "application/octet-stream",
  });
  form.append("file", encryptedBlob, `${originalName}.cyber10enc`);

  // Safe Pinata metadata — NO secrets, NO keys
  const metadata = {
    name: `${originalName}.cyber10enc`,
    keyvalues: {
      encrypted: "true",
      algorithm: "AES-256-GCM",
      version: "1",
      // Display metadata for the dashboard — NOT the file content
      originalMimeType,
      originalSizeBytes: String(originalSizeBytes),
      owner: ownerAddress.toLowerCase(),
    },
  };
  form.append("name", metadata.name);
  form.append("network", "public");
  form.append("keyvalues", JSON.stringify(metadata.keyvalues));

  // Upload to Pinata Files API v3
  let response: Response;
  try {
    response = await fetch(PINATA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        // Note: do NOT set Content-Type when using FormData — the browser/fetch
        // sets it automatically with the correct multipart boundary.
      },
      body: form,
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : "Unknown network error";
    throw new Error(`Pinata network request failed: ${msg}`);
  }

  if (!response.ok) {
    let errorBody = "(no body)";
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Pinata API returned ${response.status}: ${response.statusText}. ` +
      `Body: ${errorBody.slice(0, 200)}`
    );
  }

  let json: { data?: { id?: string; cid?: string; size?: number; created_at?: string } };
  try {
    json = await response.json();
  } catch {
    throw new Error("Pinata returned a non-JSON response.");
  }

  const data = json?.data;
  if (!data?.cid) {
    throw new Error("Pinata response did not include a CID. Upload may have failed.");
  }

  return {
    cid: data.cid,
    fileId: data.id ?? "",
    size: data.size ?? encryptedData.byteLength,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

/**
 * Generate a pre-signed Pinata upload URL.
 * Allows client browsers to upload encrypted files directly to Pinata,
 * completely bypassing Vercel's 4.5 MB serverless payload limits and supporting up to 500 MB.
 */
export async function createPinataSignedUploadUrl(name: string, expiresSeconds = 300): Promise<string> {
  const jwt = getPinataJwt();
  const date = Math.floor(Date.now() / 1000);

  const res = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      network: "public",
      expires: expiresSeconds,
      name,
      date,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to generate signed upload URL (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  if (!json?.data) {
    throw new Error("Invalid response from Pinata signed URL service.");
  }

  return json.data as string;
}
