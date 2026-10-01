import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { createFileRecord, listFilesByOwner } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";
import { randomBytes } from "crypto";

/**
 * POST /api/files
 * Authenticated file creation:
 * - Derives owner strictly from authenticated session (server-side enforcement).
 * - Generates cryptographically secure fileId.
 * - Initializes file record with status: 'preparing'.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in with your wallet to upload files." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      filename,
      originalName,
      size,
      mimeType,
      chunkSize,
      totalChunks,
      encryptionAlgorithm,
      integrityAlgorithm,
    } = body;

    const actualName = filename || originalName;
    if (!actualName || typeof actualName !== "string") {
      return NextResponse.json(
        { success: false, error: "Filename is required." },
        { status: 400 }
      );
    }

    if (typeof size !== "number" || size < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid file size." },
        { status: 400 }
      );
    }

    const fileId = `sv_${Date.now()}_${randomBytes(6).toString("hex")}`;
    const calculatedChunks =
      typeof totalChunks === "number" && totalChunks > 0
        ? totalChunks
        : Math.max(1, Math.ceil(size / (chunkSize || 8388608)));

    const file = await createFileRecord({
      fileId,
      ownerWallet: auth.walletAddress,
      filename: actualName,
      size,
      mimeType: mimeType || "application/octet-stream",
      chunkSize: chunkSize || 8388608,
      totalChunks: calculatedChunks,
      encryptionAlgorithm: encryptionAlgorithm || "AES-256-GCM",
      integrityAlgorithm: integrityAlgorithm || "SHA-256",
    });

    // Also mirror to payloadStore cache
    payloadStore.createFile({
      ownerWallet: auth.walletAddress,
      originalName: actualName,
      size,
      mimeType: mimeType || "application/octet-stream",
      totalChunks: calculatedChunks,
      chunkSize: chunkSize || 8388608,
      uploadStatus: "pending",
    });

    payloadStore.appendActivity(
      auth.walletAddress,
      "file_created",
      `File record initialized for ${actualName}`,
      { fileId, size, totalChunks: calculatedChunks }
    );

    return NextResponse.json(
      {
        success: true,
        file: {
          id: file.fileId,
          fileId: file.fileId,
          owner: auth.walletAddress,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          chunkSize: file.chunkSize,
          totalChunks: file.totalChunks,
          encryptionAlgorithm: file.encryptionAlgorithm,
          integrityAlgorithm: file.integrityAlgorithm,
          status: file.status,
          createdAt: file.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating file record";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/files
 * Lists all active files owned by the authenticated wallet.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in to view files." },
        { status: 401 }
      );
    }

    const files = await listFilesByOwner(auth.walletAddress);

    return NextResponse.json(
      {
        success: true,
        files: files.map((f) => ({
          id: f.fileId,
          fileId: f.fileId,
          filename: f.filename,
          size: f.size,
          mimeType: f.mimeType,
          totalChunks: f.totalChunks,
          chunkSize: f.chunkSize,
          status: f.status,
          manifestCID: f.manifestCID,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing files";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
