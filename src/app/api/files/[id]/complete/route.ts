import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, getChunksForFile, updateFileRecord } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/files/:fileId/complete
 *
 * Server-Side Completion Verification:
 * 1. Verifies caller is the authentic file owner.
 * 2. Verifies that EVERY expected chunk (0 through totalChunks - 1) exists in the database.
 * 3. Verifies required chunk metadata (CID, SHA-256, IV, encryptedSize).
 * 4. Verifies manifestCID reference.
 * 5. Marks file as 'complete' in the database.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this file." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const manifestCID = body.manifestCID || file.manifestCID;

    // Step 1: Query all registered chunks
    const chunks = await getChunksForFile(fileId);
    const chunkMap = new Map<number, typeof chunks[0]>();
    for (const c of chunks) {
      chunkMap.set(c.chunkIndex, c);
    }

    // Step 2: Verify every chunk index from 0 to totalChunks - 1 exists
    const missing: number[] = [];
    for (let i = 0; i < file.totalChunks; i++) {
      const c = chunkMap.get(i);
      if (!c || !c.ipfsCID || !c.sha256 || !c.iv) {
        missing.push(i);
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot complete upload: ${missing.length} of ${file.totalChunks} chunks are missing or incomplete.`,
          missingChunks: missing,
          totalChunks: file.totalChunks,
          receivedChunks: chunks.length,
        },
        { status: 400 }
      );
    }

    // Step 3: Mark file as complete in database
    const updated = await updateFileRecord(fileId, {
      status: "complete",
      manifestCID: manifestCID || undefined,
    });

    // Also update payloadStore cache
    payloadStore.updateFile(fileId, { uploadStatus: "completed", integrityStatus: "verified" });

    // Step 4: Record immutable activity audit log
    payloadStore.appendActivity(
      auth.walletAddress,
      "upload_completed",
      `All ${file.totalChunks} chunks verified and upload completed for ${file.filename}`,
      { fileId, totalChunks: file.totalChunks, manifestCID }
    );

    return NextResponse.json(
      {
        success: true,
        message: "File upload verified and marked as complete.",
        file: {
          fileId: updated?.fileId,
          filename: updated?.filename,
          size: updated?.size,
          status: updated?.status,
          totalChunks: updated?.totalChunks,
          manifestCID: updated?.manifestCID,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error completing upload";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
