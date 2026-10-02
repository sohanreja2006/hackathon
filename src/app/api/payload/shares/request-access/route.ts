import { NextRequest, NextResponse } from "next/server";
import { payloadStore } from "@/lib/payload/store";
import { formatShareCodeInput } from "@/lib/shareCode";

/**
 * POST /api/payload/shares/request-access
 * Called by a recipient to submit an access request for a share.
 * Body: { shareCode, requesterAddress?, requesterNote? }
 * Returns: { success, requestId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareCode: rawCode, requesterAddress, requesterNote } = body;

    const shareCode = formatShareCodeInput(rawCode || "");
    if (!shareCode || shareCode.length < 10) {
      return NextResponse.json({ success: false, error: "Invalid share code." }, { status: 400 });
    }

    const { share, status } = payloadStore.lookupShareByCode(shareCode);
    if (!share) {
      return NextResponse.json(
        { success: false, error: status === "expired" ? "Share has expired." : "Share not found." },
        { status: 404 }
      );
    }

    // Check for a duplicate pending request from the same address
    if (requesterAddress) {
      const existing = payloadStore
        .getPendingRequestsForOwner(share.ownerWallet)
        .find(
          (r) =>
            r.shareCode === shareCode &&
            r.requesterAddress === requesterAddress.toLowerCase() &&
            r.status === "pending"
        );
      if (existing) {
        return NextResponse.json({ success: true, requestId: existing.id });
      }
    }

    const request = payloadStore.createAccessRequest({
      shareCode,
      fileId: share.fileId,
      fileName: share.fileName,
      ownerWallet: share.ownerWallet,
      requesterAddress: requesterAddress || undefined,
      requesterNote: requesterNote || undefined,
    });

    return NextResponse.json({ success: true, requestId: request.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Request failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
