import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, getChunksForFile } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/files/:fileId/manifest
 *
 * Secure Manifest Retrieval:
 * Only accessible by:
 * 1. The authentic file owner
 * 2. An authorized recipient with an active, unexpired, non-revoked share grant
 *
 * Security:
 * - NEVER returns private encryption keys or raw AES keys.
 * - Returns chunk metadata (IPFS CIDs, SHA-256 hashes, IVs) for browser-side reconstruction.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: fileId } = await params;
    const auth = await getPayloadAuth(req);
    const callerWallet = auth?.walletAddress ? auth.walletAddress.toLowerCase() : null;

    const file = await getFileRecord(fileId);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // Check authorization: Owner OR Active Share Recipient
    let authorized = false;

    if (callerWallet && file.ownerWallet.toLowerCase() === callerWallet) {
      authorized = true;
    } else if (callerWallet) {
      // Check if caller has an active share for this file
      const shares = payloadStore.getSharesByFile(fileId);
      const activeShare = shares.find(
        (s) =>
          s.status === "active" &&
          s.recipientUserId?.toLowerCase() === callerWallet &&
          (!s.expiresAt || new Date(s.expiresAt) > new Date())
      );
      if (activeShare) {
        authorized = true;
      }
    }

    // Optional shareToken in header for link-based access
    const shareToken = req.headers.get("x-share-id") || req.headers.get("x-share-token");
    if (!authorized && shareToken) {
      const share = payloadStore.getShareById(shareToken);
      if (
        share &&
        share.fileId === fileId &&
        share.status === "active" &&
        (!share.expiresAt || new Date(share.expiresAt) > new Date())
      ) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You are not authorized to access this file manifest.",
        },
        { status: 403 }
      );
    }

    // Retrieve verified chunks
    const chunks = await getChunksForFile(fileId);

    // Build sovereign manifest payload (without private keys)
    const manifest = {
      fileId: file.fileId,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimeType,
      chunkSize: file.chunkSize,
      totalChunks: file.totalChunks,
      encryptionAlgorithm: file.encryptionAlgorithm,
      integrityAlgorithm: file.integrityAlgorithm,
      manifestCID: file.manifestCID,
      status: file.status,
      chunks: chunks.map((c) => ({
        index: c.chunkIndex,
        cid: c.ipfsCID,
        sha256: c.sha256,
        iv: c.iv,
        size: c.encryptedSize,
      })),
      createdAt: file.createdAt,
    };

    return NextResponse.json({ success: true, manifest }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving manifest";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
