import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, createShareRecord } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";
import { randomBytes } from "crypto";

/**
 * POST /api/shares
 * Authenticated Share Creation:
 * - Requires authenticated session.
 * - Server verifies caller owns the file.
 * - Server verifies file is 'complete'.
 * - Server generates a cryptographically random shareId (never db ID, timestamp, or wallet).
 * - Enforces that encryptedFileKey is wrapped/protected (never raw key).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in required to create shares." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      fileId,
      recipient,
      recipientPublicKeyFingerprint,
      encryptedFileKey,
      keyAgreementMetadata,
      expiresAt,
      maxDownloads,
      oneTime,
    } = body;

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required fileId." },
        { status: 400 }
      );
    }

    const file = await getFileRecord(fileId);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // Server-side ownership verification
    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this file." },
        { status: 403 }
      );
    }

    // Verify file is complete before sharing
    if (file.status !== "complete") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot share file: upload status is '${file.status}'. All chunks must be complete before sharing.`,
        },
        { status: 400 }
      );
    }

    if (!recipient || typeof recipient !== "string") {
      return NextResponse.json(
        { success: false, error: "Recipient wallet address or identity is required." },
        { status: 400 }
      );
    }

    if (!encryptedFileKey || typeof encryptedFileKey !== "string") {
      return NextResponse.json(
        { success: false, error: "Encrypted file key envelope is required." },
        { status: 400 }
      );
    }

    // Generate cryptographically random shareId (16 bytes = 32 hex chars)
    const shareId = `shr_${randomBytes(16).toString("hex")}`;

    const limit =
      typeof maxDownloads === "number" && maxDownloads > 0
        ? maxDownloads
        : oneTime
        ? 1
        : null;

    const share = await createShareRecord({
      shareId,
      fileId: file.fileId,
      ownerWallet: auth.walletAddress,
      recipient: recipient.toLowerCase(),
      recipientPublicKeyFingerprint,
      encryptedFileKey,
      keyAgreementMetadata,
      expiresAt: expiresAt || undefined,
      maxDownloads: limit ?? 1,
      oneTime: Boolean(oneTime),
    });

    // Mirror to payloadStore cache
    payloadStore.createShare({
      fileId: file.fileId,
      ownerWallet: auth.walletAddress,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimeType,
      manifestCID: file.manifestCID,
      recipientUserId: recipient.toLowerCase(),
      recipientPublicKeyFingerprint,
      encryptedFileKey,
      keyAgreementMetadata,
      expiresAt: expiresAt || null,
      maxDownloads: limit,
      oneTime: Boolean(oneTime),
    });

    payloadStore.appendActivity(
      auth.walletAddress,
      "share_created",
      `Share created for ${file.filename} to ${recipient}`,
      { shareId, fileId: file.fileId, recipient, expiresAt }
    );

    return NextResponse.json(
      {
        success: true,
        share: {
          shareId: share.shareId,
          fileId: share.fileId,
          owner: share.ownerWallet,
          recipient: share.recipient,
          expiresAt: share.expiresAt,
          maxDownloads: share.maxDownloads,
          oneTime: share.oneTime,
          status: share.status,
          createdAt: share.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating share";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/shares
 * Lists shares created by the authenticated owner.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    let shares = payloadStore.getSharesByOwner(auth.walletAddress);
    if (fileId) {
      shares = shares.filter((s) => s.fileId === fileId);
    }

    return NextResponse.json({ success: true, shares }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing shares";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
