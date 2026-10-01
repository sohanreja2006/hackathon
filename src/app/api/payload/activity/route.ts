import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";
import { ActivityEventType } from "@/payload/types";

/**
 * GET /api/payload/activity
 * Returns the recent cryptographic and vault activity log for the authenticated wallet.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate your wallet." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = payloadService.getActivity(auth.walletAddress, Math.min(limit, 100));
    return NextResponse.json({ success: true, activity: logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch activity log.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/payload/activity
 * Records a client-side or lifecycle event (e.g. encryption_completed, integrity_verified, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate your wallet." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { eventType, description, metadata } = body;

    if (!eventType || !description) {
      return NextResponse.json(
        { success: false, error: "eventType and description are required." },
        { status: 400 }
      );
    }

    const entry = payloadService.appendActivity(
      auth.walletAddress,
      eventType as ActivityEventType,
      description,
      metadata
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record activity log.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
