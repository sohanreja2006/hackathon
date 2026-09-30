import { NextRequest, NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";

/**
 * GET /api/payload/users/[wallet]
 * Retrieves public encryption profile for a specified wallet address.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required." },
        { status: 400 }
      );
    }

    const user = payloadService.getUser(wallet);
    if (!user || !user.publicEncryptionKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipient has not registered an encryption key yet.",
          registered: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      registered: true,
      user: {
        walletAddress: user.walletAddress,
        publicKeyHex: user.publicEncryptionKey,
        publicEncryptionKey: user.publicEncryptionKey,
        publicKeyFingerprint: user.publicKeyFingerprint,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lookup failed.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
