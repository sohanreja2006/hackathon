import { NextRequest, NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";
import { formatShareCodeInput } from "@/lib/shareCode";

/**
 * GET /api/payload/shares/lookup?code=SV-XXXX-XXXX-XXXX
 * Public sanitized endpoint for recipients to inspect a share code.
 * Does NOT expose private wallet details, encryption keys, or password hashes.
 */
export async function GET(req: NextRequest) {
  try {
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
            error: "Download limit reached. This secure share is no longer available.",
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

    // Sanitized share information for recipient
    const sanitized = {
      shareCode: share.shareCode,
      fileName: share.fileName,
      fileSize: share.fileSize,
      mimeType: share.mimeType,
      encryptionAlgorithm: share.encryptionAlgorithm,
      integrityAlgorithm: share.integrityAlgorithm,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads,
      downloadCount: share.downloadCount,
      downloadsRemaining:
        share.maxDownloads !== null
          ? Math.max(0, share.maxDownloads - share.downloadCount)
          : "Unlimited",
      oneTime: share.oneTime,
      passwordProtected: share.passwordProtected,
      status: share.status,
    };

    return NextResponse.json({ success: true, share: sanitized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lookup failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
