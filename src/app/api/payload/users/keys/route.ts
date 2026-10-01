import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * POST /api/payload/users/keys
 * Registers or updates the user's public encryption key and fingerprint.
 *
 * SECURITY INVARIANTS:
 * - REQUIRES authenticated SIWE session.
 * - Key is registered ONLY for the authenticated wallet (never body-supplied).
 * - NEVER accepts or stores private keys.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in with your wallet." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const publicKey = body.publicKeyHex || body.publicEncryptionKey;
    const fingerprint = body.fingerprint || body.publicKeyFingerprint;

    if (!publicKey || !fingerprint) {
      return NextResponse.json(
        { success: false, error: "Missing public encryption key or fingerprint." },
        { status: 400 }
      );
    }

    // SECURITY: Always register for the authenticated wallet, never body-supplied
    const user = payloadService.registerUserPublicKey(
      auth.walletAddress,
      publicKey,
      fingerprint
    );

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        publicKeyHex: user.publicEncryptionKey,
        publicEncryptionKey: user.publicEncryptionKey,
        publicKeyFingerprint: user.publicKeyFingerprint,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register encryption key.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
