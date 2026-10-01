import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { listActivityLogs } from "@/lib/payload/db";

/**
 * GET /api/activity
 * Lists audit logs for the authenticated wallet.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await listActivityLogs(auth.walletAddress, limit);
    return NextResponse.json({ success: true, logs }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing activity logs";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
