import { NextRequest, NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";
import { formatShareCodeInput } from "@/lib/shareCode";

import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/payload/shares/lookup?code=SV-XXXX-XXXX-XXXX
 * Public sanitized endpoint for recipients to inspect a share code.
 * Does NOT expose private wallet details, encryption keys, or password hashes.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`share_lookup:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimit.error },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) } }
      );
    }
    if (rateLimit.delayMs) {
      await new Promise((r) => setTimeout(r, rateLimit.delayMs));
    }

    const { searchParams } = new URL(req.url);
    const rawCode = searchParams.get("code") || "";
    const code = formatShareCodeInput(rawCode);

    if (!code || code.length < 10) {
      return NextResponse.json(
        {
          success: false,
          status: "not-found",
          error: "Share not found. Check the code and try again.",
        },
        { status: 404 }
      );
    }

    const { share, status } = payloadService.lookupShare(code);

    if (status === "not-found" || !share) {
      if (status === "expired") {
        return NextResponse.json(
          {
            success: false,
            status: "expired",
            error: "This share has expired. The file owner is no longer sharing this file through this code.",
          },
          { status: 410 }
        );
      }
      if (status === "revoked") {
        return NextResponse.json(
          {
            success: false,
            status: "revoked",
            error: "This share is no longer available. The owner has revoked access to this file.",
          },
          { status: 410 }
        );
      }
      if (status === "download-limit-reached") {
        return NextResponse.json(
          {
            success: false,
            status: "download-limit-reached",
            error: "The download limit for this share has been reached.",
          },
          { status: 410 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          status: "not-found",
          error: "Share not found. Check the code and try again.",
        },
        { status: 404 }
      );
    }

    // Sanitized share information for recipient (NO raw keys or envelopes exposed)
    const sanitized = {
      shareCode: share.shareCode,
      fileName: share.fileName,
      fileSize: share.fileSize,
      mimeType: share.mimeType,
      manifestCID: share.manifestCID,
      encryptionAlgorithm: share.encryptionAlgorithm,
      integrityAlgorithm: share.integrityAlgorithm,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      oneTime: share.oneTime,
      recipientUserId: share.recipientUserId,
      recipientPublicKeyFingerprint: share.recipientPublicKeyFingerprint,
      isQuickShare: share.isQuickShare,
      hasEncryptedKey: Boolean(share.encryptedFileKey || share.quickShareEnvelope),
      passwordProtected: share.passwordProtected,
      status: share.status,
    };

    return NextResponse.json({ success: true, share: sanitized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lookup failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
