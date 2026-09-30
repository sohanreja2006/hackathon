import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWallet } from "@/lib/auth/session";
import { uploadEncryptedFileToPinata, MAX_ENCRYPTED_SIZE_BYTES } from "@/lib/ipfs/pinata";
import type { UploadApiResponse } from "@/types/files";

/**
 * POST /api/files/upload
 *
 * Secure encrypted-file upload endpoint.
 *
 * SECURITY ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Browser: encrypts file with AES-256-GCM → sends CIPHERTEXT only │
 * │ Server : verifies session → uploads ciphertext to Pinata        │
 * │ Server : returns CID → browser displays it                      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * The server NEVER receives plaintext. The AES key is NEVER sent here.
 *
 * Expected multipart/form-data fields:
 *   encryptedFile  — binary: the AES-256-GCM ciphertext blob (.cyber10enc)
 *   originalName   — string: original filename (display only)
 *   originalMime   — string: original MIME type (display only)
 *   originalSize   — string: original file size in bytes (display only)
 *
 * Response 200: { success: true, cid, fileId, size, uploadedAt }
 * Response 400: { success: false, error: string }
 * Response 401: { success: false, error: "Unauthorized" }
 * Response 413: { success: false, error: "File too large" }
 * Response 500: { success: false, error: "Upload failed." }
 */
export async function POST(req: NextRequest): Promise<NextResponse<UploadApiResponse>> {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const wallet = await getAuthenticatedWallet();
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in with your wallet first." },
      { status: 401 }
    );
  }

  // ── 2. Parse multipart body ────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request: could not parse form data." },
      { status: 400 }
    );
  }

  const encryptedFileEntry = formData.get("encryptedFile");
  const originalName = (formData.get("originalName") as string | null)?.trim() || "unknown";
  const originalMime = (formData.get("originalMime") as string | null)?.trim() || "application/octet-stream";
  const originalSizeStr = formData.get("originalSize") as string | null;
  const originalSize = originalSizeStr ? parseInt(originalSizeStr, 10) : 0;

  // ── 3. Validate encrypted file ─────────────────────────────────────────────
  if (!encryptedFileEntry || !(encryptedFileEntry instanceof Blob)) {
    return NextResponse.json(
      { success: false, error: "Missing required field: encryptedFile." },
      { status: 400 }
    );
  }

  const encryptedBuffer = Buffer.from(await encryptedFileEntry.arrayBuffer());

  if (encryptedBuffer.byteLength === 0) {
    return NextResponse.json(
      { success: false, error: "Encrypted file is empty." },
      { status: 400 }
    );
  }

  if (encryptedBuffer.byteLength > MAX_ENCRYPTED_SIZE_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `File too large. Maximum encrypted size is 50 MB. Received: ${(encryptedBuffer.byteLength / 1024 / 1024).toFixed(2)} MB.`,
      },
      { status: 413 }
    );
  }

  // ── 4. SECURITY: Verify this is a CYBER-10 encrypted bundle ────────────────
  // Check for the "CYBR" magic bytes at the start of the buffer.
  // This prevents accidentally uploading unencrypted files.
  const MAGIC = [0x43, 0x59, 0x42, 0x52]; // "CYBR"
  const hasMagic = MAGIC.every((byte, i) => encryptedBuffer[i] === byte);
  if (!hasMagic) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid encrypted bundle format. Only CYBER-10 AES-256-GCM encrypted files (.cyber10enc) are accepted.",
      },
      { status: 400 }
    );
  }

  // ── 5. Upload to Pinata ────────────────────────────────────────────────────
  try {
    const result = await uploadEncryptedFileToPinata({
      encryptedData: encryptedBuffer,
      originalName,
      originalMimeType: originalMime,
      originalSizeBytes: isNaN(originalSize) ? 0 : originalSize,
      ownerAddress: wallet.address,
    });

    return NextResponse.json({
      success: true,
      cid: result.cid,
      fileId: result.fileId,
      size: result.size,
      uploadedAt: result.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown upload error.";

    // Return a user-friendly error — never expose Pinata secrets or stack traces
    if (message.includes("50 MB")) {
      return NextResponse.json(
        { success: false, error: "Encrypted file exceeds the 50 MB limit." },
        { status: 413 }
      );
    }

    if (
      message.includes("PINATA_JWT") ||
      message.includes("not configured")
    ) {
      return NextResponse.json(
        { success: false, error: "Upload service is not configured. Contact the administrator." },
        { status: 503 }
      );
    }

    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("authentication")
    ) {
      return NextResponse.json(
        { success: false, error: "Upload service authentication failed. Contact the administrator." },
        { status: 503 }
      );
    }

    if (message.includes("network") || message.includes("fetch")) {
      return NextResponse.json(
        { success: false, error: "Upload failed. Network error reaching storage service." },
        { status: 502 }
      );
    }

    // Generic safe fallback — never include internal details
    return NextResponse.json(
      { success: false, error: "Upload failed. Your encrypted file was not stored." },
      { status: 500 }
    );
  }
}

// Only POST is supported
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed." },
    { status: 405 }
  );
}
