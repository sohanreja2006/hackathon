import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getShareRecord, getFileRecord, updateShareRecord, getChunksForFile } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/shares/:id
 * Secure Share Validation & Metadata Endpoint:
 *
 * Backend verifies:
 * 1. Share exists.
 * 2. Share is active (not revoked, not expired, not limit-reached).
 * 3. Server-side expiration check (current time <= expiresAt).
 * 4. Server-side download limit check (downloadCount < maxDownloads).
 * 5. Recipient authorization check (if recipient is bound to specific wallet).
 * 6. File exists, is complete, and is not deleted.
 *
 * NOTE: GET validates access and returns metadata/chunks/envelope.
 * It DOES NOT increment downloadCount or revoke one-time shares on read.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: shareId } = await params;
    const auth = await getPayloadAuth(req);
    const callerWallet = auth?.walletAddress ? auth.walletAddress.toLowerCase() : null;

    // 1. Fetch share record
    let share = await getShareRecord(shareId);
    if (!share) {
      const fromStore = payloadStore.lookupShareByCode(shareId).share || payloadStore.getShareById(shareId);
      if (fromStore) {
        share = {
          id: fromStore.id,
          shareId: fromStore.shareId || fromStore.id || shareId,
          fileId: fromStore.fileId,
          ownerWallet: fromStore.ownerWallet,
          recipient: fromStore.recipientUserId || "public",
          recipientPublicKeyFingerprint: fromStore.recipientPublicKeyFingerprint,
          encryptedFileKey: fromStore.encryptedFileKey || "",
          keyAgreementMetadata: fromStore.keyAgreementMetadata as Record<string, unknown> | undefined,
          expiresAt: fromStore.expiresAt || undefined,
          maxDownloads: fromStore.maxDownloads ?? 1,
          downloadCount: fromStore.downloadCount,
          oneTime: Boolean(fromStore.oneTime),
          status: fromStore.status,
          createdAt: fromStore.createdAt,
        };
      }
    }

    if (!share) {
      return NextResponse.json(
        { success: false, error: "Share not found or has been revoked." },
        { status: 404 }
      );
    }

    const now = new Date();

    // 2. Expiration check
    if (share.expiresAt && new Date(share.expiresAt) <= now) {
      if (share.status === "active") {
        await updateShareRecord(share.shareId || shareId, { status: "expired" });
      }
      return NextResponse.json(
        { success: false, error: "This share has expired.", status: "expired" },
        { status: 410 }
      );
    }

    // 3. Status check
    if (share.status === "revoked") {
      return NextResponse.json(
        { success: false, error: "This share has been revoked.", status: "revoked" },
        { status: 403 }
      );
    }

    if (share.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `This share is no longer available (${share.status}).`,
          status: share.status,
        },
        { status: 403 }
      );
    }

    // 4. Download limit check
    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      await updateShareRecord(share.shareId || shareId, { status: "download-limit-reached" });
      return NextResponse.json(
        {
          success: false,
          error: "Download limit reached.",
          status: "download-limit-reached",
        },
        { status: 403 }
      );
    }

    // 5. Recipient authorization check if bound
    const isRestrictedRecipient =
      share.recipient &&
      share.recipient.startsWith("0x") &&
      share.recipient !== "public" &&
      share.recipient !== "anyone";

    if (isRestrictedRecipient) {
      if (!callerWallet) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required to access this restricted share.",
            requiresAuth: true,
            recipient: share.recipient,
          },
          { status: 401 }
        );
      }
      if (callerWallet !== share.recipient.toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            error: "ACCESS DENIED: Unauthorized recipient wallet.",
            status: "unauthorized",
          },
          { status: 403 }
        );
      }
    }

    // 6. Check underlying file
    let file = await getFileRecord(share.fileId);
    if (!file) {
      const f = payloadStore.getFileById(share.fileId);
      if (f) {
        file = {
          id: f.id,
          fileId: f.id,
          ownerWallet: f.ownerWallet,
          filename: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
          chunkSize: f.chunkSize,
          totalChunks: f.totalChunks,
          encryptionAlgorithm: f.encryptionAlgorithm,
          integrityAlgorithm: f.integrityAlgorithm,
          manifestCID: f.manifestCID,
          status: "complete",
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        };
      }
    }

    if (!file || file.status === "deleted") {
      return NextResponse.json(
        { success: false, error: "The requested file has been deleted by the owner." },
        { status: 404 }
      );
    }

    // Retrieve chunk metadata for browser-side decryption
    const chunks = await getChunksForFile(file.fileId);

    // Parse keyAgreementMetadata if needed
    let keyAgreement = share.keyAgreementMetadata;
    if (typeof keyAgreement === "string") {
      try {
        keyAgreement = JSON.parse(keyAgreement);
      } catch {
        // ignore
      }
    }

    // Return safe share payload (NEVER private keys or raw AES key)
    return NextResponse.json(
      {
        success: true,
        share: {
          shareId: share.shareId,
          fileId: file.fileId,
          fileName: file.filename,
          fileSize: file.size,
          mimeType: file.mimeType,
          totalChunks: file.totalChunks,
          chunkSize: file.chunkSize,
          manifestCID: file.manifestCID,
          encryptedFileKey: share.encryptedFileKey,
          keyAgreementMetadata: keyAgreement,
          recipientPublicKeyFingerprint: share.recipientPublicKeyFingerprint,
          recipient: share.recipient,
          ownerWallet: share.ownerWallet,
          status: share.status,
          downloadCount: share.downloadCount,
          maxDownloads: share.maxDownloads,
          oneTime: share.oneTime,
          isQuickShare: !isRestrictedRecipient,
          chunks: chunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            index: c.chunkIndex,
            cid: c.ipfsCID,
            ipfsCID: c.ipfsCID,
            sha256: c.sha256,
            hash: c.sha256,
            iv: c.iv,
            size: c.encryptedSize,
          })),
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error accessing share";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/shares/:id
 * Atomic Download Claim / Counter Increment:
 *
 * Called upon successful authorized access and verification.
 * Server-side atomic updates:
 * - Increments downloadCount += 1.
 * - If oneTime is true, immediately marks status = 'revoked'.
 * - If downloadCount >= maxDownloads, marks status = 'download-limit-reached'.
 * - Records activity log.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: shareId } = await params;
    const auth = await getPayloadAuth(req);
    const callerWallet = auth?.walletAddress ? auth.walletAddress.toLowerCase() : null;

    let share = await getShareRecord(shareId);
    if (!share) {
      const fromStore = payloadStore.lookupShareByCode(shareId).share || payloadStore.getShareById(shareId);
      if (fromStore) {
        share = {
          id: fromStore.id,
          shareId: fromStore.shareId || fromStore.id || shareId,
          fileId: fromStore.fileId,
          ownerWallet: fromStore.ownerWallet,
          recipient: fromStore.recipientUserId || "public",
          recipientPublicKeyFingerprint: fromStore.recipientPublicKeyFingerprint,
          encryptedFileKey: fromStore.encryptedFileKey || "",
          keyAgreementMetadata: fromStore.keyAgreementMetadata as Record<string, unknown> | undefined,
          expiresAt: fromStore.expiresAt || undefined,
          maxDownloads: fromStore.maxDownloads ?? 1,
          downloadCount: fromStore.downloadCount,
          oneTime: Boolean(fromStore.oneTime),
          status: fromStore.status,
          createdAt: fromStore.createdAt,
        };
      }
    }

    if (!share) {
      return NextResponse.json(
        { success: false, error: "Share not found." },
        { status: 404 }
      );
    }

    const now = new Date();

    if (share.expiresAt && new Date(share.expiresAt) <= now) {
      await updateShareRecord(share.shareId || shareId, { status: "expired" });
      return NextResponse.json(
        { success: false, error: "This share has expired." },
        { status: 410 }
      );
    }

    if (share.status !== "active") {
      return NextResponse.json(
        { success: false, error: `This share is ${share.status}.` },
        { status: 403 }
      );
    }

    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      await updateShareRecord(share.shareId || shareId, { status: "download-limit-reached" });
      return NextResponse.json(
        { success: false, error: "Download limit reached." },
        { status: 403 }
      );
    }

    // Atomic increment
    const newDownloadCount = share.downloadCount + 1;
    let nextStatus: "active" | "expired" | "revoked" | "download-limit-reached" = "active";

    if (share.oneTime) {
      nextStatus = "revoked";
    } else if (share.maxDownloads !== null && newDownloadCount >= share.maxDownloads) {
      nextStatus = "download-limit-reached";
    }

    await updateShareRecord(share.shareId || shareId, {
      downloadCount: newDownloadCount,
      status: nextStatus,
      lastAccessedAt: now.toISOString(),
    });

    // Record activity log
    payloadStore.appendActivity(
      callerWallet || share.recipient,
      "share_accessed",
      `Share download completed (${newDownloadCount}/${share.maxDownloads ?? "unlimited"})`,
      { shareId: share.shareId, fileId: share.fileId, downloadCount: newDownloadCount }
    );

    return NextResponse.json({
      success: true,
      downloadCount: newDownloadCount,
      status: nextStatus,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error claiming download";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
