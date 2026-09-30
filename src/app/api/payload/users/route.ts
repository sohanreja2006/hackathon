import { NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";

/**
 * GET /api/payload/users
 * Returns list of registered users who have public encryption keys set up.
 */
export async function GET() {
  try {
    const all = payloadService.listUsers();
    const registered = all.filter((u) => Boolean(u.publicEncryptionKey));
    return NextResponse.json({
      success: true,
      users: registered,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list users.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
