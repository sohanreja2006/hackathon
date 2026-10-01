import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * GET /api/payload/users
 * Returns list of registered users who have public encryption keys set up.
 *
 * SECURITY: Requires authentication. An unauthenticated user should not be
 * able to enumerate all registered wallet addresses.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in with your wallet." },
        { status: 401 }
      );
    }

    const all = payloadService.listUsers();
    const registered = all.filter((u) => Boolean(u.publicEncryptionKey));
    return NextResponse.json({
      success: true,
      users: registered.map((u) => ({
        walletAddress: u.walletAddress,
        publicKeyFingerprint: u.publicKeyFingerprint,
        // Only expose public information, not internal IDs or metadata
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list users.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
