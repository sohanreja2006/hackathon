import { NextRequest, NextResponse } from "next/server";
import { payloadStore } from "@/lib/payload/store";
import { getPayloadAuth } from "@/lib/payload/client";

/**
 * GET /api/payload/shares/pending-approvals
 * Returns all access requests pending approval for the authenticated owner.
 *
 * DELETE /api/payload/shares/pending-approvals?requestId=XXX&action=approve|deny
 * Owner approves or denies a specific request.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const requests = payloadStore.getPendingRequestsForOwner(auth.walletAddress);

    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch pending approvals.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || !["approve", "deny"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid requestId or action." }, { status: 400 });
    }

    let result;
    if (action === "approve") {
      result = payloadStore.approveAccessRequest(requestId, auth.walletAddress);
    } else {
      result = payloadStore.denyAccessRequest(requestId, auth.walletAddress);
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Request not found or you are not the owner." },
        { status: 404 }
      );
    }

    // Log the action
    payloadStore.appendActivityLog(
      auth.walletAddress,
      "share_accessed",
      `Access request ${action === "approve" ? "approved" : "denied"} for ${result.fileName} (from ${result.requesterAddress || "anonymous"})`,
      { requestId, shareCode: result.shareCode, action }
    );

    return NextResponse.json({ success: true, request: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
