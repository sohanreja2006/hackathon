import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * PATCH /api/payload/shares/[id]/revoke
 * Revokes a share code immediately.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate your wallet." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Share ID is required." },
        { status: 400 }
      );
    }

    const success = payloadService.revokeShare(id, auth.walletAddress);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Share not found or you are not the owner." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Share revoked successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Revoke failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
