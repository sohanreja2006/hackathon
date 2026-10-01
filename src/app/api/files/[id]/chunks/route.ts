import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, recordChunkData, getChunksForFile, updateFileRecord } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";
import { isValidCid } from "@/lib/ipfs/gateway";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/files/:fileId/chunks
 * Registers an encrypted chunk metadata record after browser-side IPFS upload.
 * Validates ownership, chunk index bounds, hash format, IV, and CID.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in required." },
        { status: 401 }
      );
    }

    const file = await getFileRecord(fileId);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // Server-side ownership enforcement
    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this file." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { chunkIndex, ipfsCID, sha256, iv, encryptedSize, chunkSize } = body;

    // Validation
    if (typeof chunkIndex !== "number" || chunkIndex < 0 || chunkIndex >= file.totalChunks) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chunkIndex: must be between 0 and ${file.totalChunks - 1}.`,
        },
        { status: 400 }
      );
    }

    if (!ipfsCID || typeof ipfsCID !== "string" || !isValidCid(ipfsCID.trim())) {
      return NextResponse.json(
        { success: false, error: "Invalid IPFS CID format." },
        { status: 400 }
      );
    }

    if (!sha256 || typeof sha256 !== "string" || sha256.length !== 64) {
      return NextResponse.json(
        { success: false, error: "Invalid SHA-256 hash: expected 64 hex characters." },
        { status: 400 }
      );
    }

    if (!iv || typeof iv !== "string" || iv.length < 24) {
      return NextResponse.json(
        { success: false, error: "Invalid IV: expected at least 96-bit (24 hex characters)." },
        { status: 400 }
      );
    }

    const encSize = typeof encryptedSize === "number" ? encryptedSize : Number(chunkSize) || 0;
    if (encSize <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid encrypted chunk size." },
        { status: 400 }
      );
    }

    // Record chunk in persistent DB
    const chunk = await recordChunkData({
      fileId,
      chunkIndex,
      ipfsCID: ipfsCID.trim(),
      sha256: sha256.trim().toLowerCase(),
      iv: iv.trim(),
      encryptedSize: encSize,
      status: "verified",
    });

    // Mirror to payloadStore cache
    payloadStore.createOrUpdateChunk({
      fileId,
      chunkIndex,
      chunkSize: encSize,
      encryptedSize: encSize,
      iv: iv.trim(),
      hash: sha256.trim().toLowerCase(),
      cid: ipfsCID.trim(),
      status: "verified",
    });

    // Update file status to 'uploading' if it was preparing
    if (file.status === "preparing") {
      await updateFileRecord(fileId, { status: "uploading" });
    }

    return NextResponse.json(
      {
        success: true,
        chunk: {
          fileId: chunk.fileId,
          chunkIndex: chunk.chunkIndex,
          ipfsCID: chunk.ipfsCID,
          sha256: chunk.sha256,
          iv: chunk.iv,
          encryptedSize: chunk.encryptedSize,
          status: chunk.status,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error registering chunk";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/files/:fileId/chunks
 * Lists all registered chunks for a file (owner only).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const file = await getFileRecord(fileId);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const chunks = await getChunksForFile(fileId);
    return NextResponse.json({ success: true, chunks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing chunks";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
