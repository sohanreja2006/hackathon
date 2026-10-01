import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/payload/shares/:id/burn
 *
 * Self-Destruct / Burn-on-Read Endpoint:
 * - REQUIRES authentication.
 * - Only the share owner OR the designated recipient can trigger burn.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Share ID or code is required" }, { status: 400 });
    }

    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Sign in required to burn shares." },
        { status: 401 }
      );
    }

    // Verify the caller owns the share or is the designated recipient
    const share = payloadStore.getShareById(id) || payloadStore.lookupShareByCode(id).share;
    if (!share) {
      return NextResponse.json({ success: false, error: "Share not found." }, { status: 404 });
    }

    const callerWallet = auth.walletAddress.toLowerCase();
    const isOwner = share.ownerWallet?.toLowerCase() === callerWallet;
    const isRecipient = share.recipientUserId?.toLowerCase() === callerWallet;

    if (!isOwner && !isRecipient) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only the share owner or designated recipient can burn this share." },
        { status: 403 }
      );
    }

    const result = payloadService.burnShare(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Share not found or already burned" }, { status: 404 });
    }

    payloadService.appendActivity(
      auth.walletAddress,
      "share_revoked",
      `Share ${id} burned/self-destructed`,
      { shareId: id }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Share self-destructed and encrypted envelope permanently purged.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error burning share";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
