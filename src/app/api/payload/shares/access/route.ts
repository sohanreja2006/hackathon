import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";
import { formatShareCodeInput } from "@/lib/shareCode";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * POST /api/payload/shares/access
 * Recipient validates authentication (and password if required) and retrieves
 * the asymmetric key envelope, manifest, and chunk CIDs for local WebCrypto decryption.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const body = await req.json();
    const code = body.code || body.shareCode;
    const password = body.password;

    const normalizedCode = formatShareCodeInput(code || "");
    if (!normalizedCode) {
      return NextResponse.json(
        { success: false, error: "Share code is required." },
        { status: 400 }
      );
    }

    // Rate limiting per IP + share code to prevent brute forcing
    const rateLimit = checkRateLimit(`share_access:${ip}:${normalizedCode}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimit.error },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) } }
      );
    }
    if (rateLimit.delayMs) {
      await new Promise((r) => setTimeout(r, rateLimit.delayMs));
    }

    // Authenticate accessor if present (via wallet header or session)
    const auth = await getPayloadAuth(req);
    const accessorWallet = auth?.walletAddress || body.accessorWallet;

    const result = await payloadService.accessShare(normalizedCode, accessorWallet, password);

    if (!result.success || !result.share) {
      if (result.status === "unauthorized") {
        return NextResponse.json(
          {
            success: false,
            status: "unauthorized",
            error: result.error || "Access denied. You are not the authorized recipient.",
          },
          { status: 403 }
        );
      }
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
            error: "The download limit for this share has been reached.",
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
      // E2EE Key Envelope
      encryptedFileKey: share.encryptedFileKey || null,
      keyAgreementMetadata: share.keyAgreementMetadata || null,
      isQuickShare: share.isQuickShare || false,
      quickShareEnvelope: share.quickShareEnvelope || null,
      recipientPublicKeyFingerprint: share.recipientPublicKeyFingerprint || null,
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
