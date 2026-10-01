import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getShareRecord, updateShareRecord } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/shares/:shareId/revoke
 *
 * Revocation Endpoint:
 * - Only the authentic file owner can revoke a share.
 * - Sets share status = 'revoked'.
 * - Guarantees that future access through SecureVault is denied.
 * - Records revocation event in activity audit log.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: shareId } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const share = await getShareRecord(shareId);
    if (!share) {
      return NextResponse.json({ success: false, error: "Share not found." }, { status: 404 });
    }

    // Owner check: Only the file/share creator can revoke
    if (share.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only the file owner can revoke this share." },
        { status: 403 }
      );
    }

    await updateShareRecord(shareId, { status: "revoked" });
    payloadStore.revokeShare(shareId, auth.walletAddress);

    payloadStore.appendActivity(
      auth.walletAddress,
      "share_revoked",
      `Share ${shareId} revoked by owner`,
      { shareId, fileId: share.fileId }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Future access through SecureVault has been revoked.",
        share: {
          shareId,
          status: "revoked",
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error revoking share";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
