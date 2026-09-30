import { NextRequest, NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";
import { formatShareCodeInput } from "@/lib/shareCode";

/**
 * POST /api/payload/shares/access
 * Recipient validates password (if required) and retrieves manifest & chunk CIDs + SHA-256 hashes.
 * Increments download count and updates share status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, password } = body;

    const normalizedCode = formatShareCodeInput(code || "");
    if (!normalizedCode) {
      return NextResponse.json(
        { success: false, error: "Share code is required." },
        { status: 400 }
      );
    }

    const result = await payloadService.accessShare(normalizedCode, password);

    if (!result.success || !result.share) {
      if (result.status === "expired") {
        return NextResponse.json(
          {
            success: false,
            status: "expired",
            error: "This share has expired. The file owner is no longer sharing this file through this code.",
          },
          { status: 410 }
        );
      }
      if (result.status === "revoked") {
        return NextResponse.json(
          {
            success: false,
            status: "revoked",
            error: "This share is no longer available. The owner has revoked access to this file.",
          },
          { status: 410 }
        );
      }
      if (result.status === "download-limit-reached") {
        return NextResponse.json(
          {
            success: false,
            status: "download-limit-reached",
            error: "Download limit reached. This secure share is no longer available.",
          },
          { status: 410 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Share not found or access denied.",
        },
        { status: 400 }
      );
    }

    const { share, manifest, chunks } = result;

    // Return manifest & chunk metadata needed for browser-side IPFS download and SHA-256 verification
    return NextResponse.json({
      success: true,
      file: {
        fileName: share.fileName,
        fileSize: share.fileSize,
        mimeType: share.mimeType,
        manifestCID: share.manifestCID,
        encryptionAlgorithm: share.encryptionAlgorithm,
        integrityAlgorithm: share.integrityAlgorithm,
      },
      manifest: manifest || null,
      chunks: (chunks || []).map((c) => ({
        index: c.chunkIndex,
        cid: c.cid,
        hash: c.hash,
        size: c.chunkSize,
        encryptedSize: c.encryptedSize,
        iv: c.iv,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Access failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
