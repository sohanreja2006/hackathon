import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, getChunksForFile } from "@/lib/payload/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/files/:fileId/upload-status
 *
 * Resumable Upload Status:
 * Returns the exact set of uploaded chunk indexes and missing chunk indexes
 * so clients can resume interrupted uploads from the exact missing chunks.
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
    const uploadedSet = new Set(chunks.map((c) => c.chunkIndex));

    const totalChunks = file.totalChunks;
    const uploadedChunks: number[] = [];
    const missingChunks: number[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (uploadedSet.has(i)) {
        uploadedChunks.push(i);
      } else {
        missingChunks.push(i);
      }
    }

    return NextResponse.json(
      {
        fileId: file.fileId,
        status: file.status,
        totalChunks,
        uploadedChunks,
        missingChunks,
        isComplete: missingChunks.length === 0,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error querying upload status";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
