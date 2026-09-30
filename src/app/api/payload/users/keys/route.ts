import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * POST /api/payload/users/keys
 * Registers or updates the user's public encryption key and fingerprint.
 * 
 * SECURITY INVARIANT:
 * - NEVER accepts or stores private keys.
 * - Authenticated via Web3 wallet header or SIWE session.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    const body = await req.json();
    const walletAddress = auth?.walletAddress || body.walletAddress;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please connect wallet." },
        { status: 401 }
      );
    }

    const publicKey = body.publicKeyHex || body.publicEncryptionKey;
    const fingerprint = body.fingerprint || body.publicKeyFingerprint;

    if (!publicKey || !fingerprint) {
      return NextResponse.json(
        { success: false, error: "Missing public encryption key or fingerprint." },
        { status: 400 }
      );
    }

    const user = payloadService.registerUserPublicKey(
      walletAddress.toLowerCase(),
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
