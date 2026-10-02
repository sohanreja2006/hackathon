import { NextRequest, NextResponse } from "next/server";
import { payloadStore } from "@/lib/payload/store";

/**
 * GET /api/payload/shares/poll-request?requestId=XXX
 * Called by recipient to check if owner has approved/denied their access request.
 * Returns: { status: "pending" | "approved" | "denied", accessToken? }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId") || "";

    if (!requestId) {
      return NextResponse.json({ success: false, error: "Missing requestId." }, { status: 400 });
    }

    const result = payloadStore.pollAccessRequest(requestId);
    if (!result) {
      return NextResponse.json({ success: false, error: "Request not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Poll failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
