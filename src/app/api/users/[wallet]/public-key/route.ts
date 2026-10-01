import { NextRequest, NextResponse } from "next/server";
import { findUserByWallet } from "@/lib/payload/db";
import { isAddress } from "viem";

interface RouteParams {
  params: Promise<{ wallet: string }>;
}

/**
 * GET /api/users/:walletAddress/public-key
 *
 * Public Encryption Key Discovery:
 * Returns ONLY public key material (publicEncryptionKey and keyFingerprint) for E2EE key agreement.
 * NEVER returns private keys, passwords, or sensitive credentials.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { wallet } = await params;
    const normalized = wallet.toLowerCase();

    if (!isAddress(normalized) && !normalized.startsWith("vx-")) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format." },
        { status: 400 }
      );
    }

    const user = await findUserByWallet(normalized);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User has not registered an encryption key." },
        { status: 404 }
      );
    }

    if (!user.publicEncryptionKey) {
      return NextResponse.json(
        {
          success: false,
          error: "User has not yet published an X25519 public encryption key.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        walletAddress: user.walletAddress,
        publicEncryptionKey: user.publicEncryptionKey,
        keyFingerprint: user.keyFingerprint || null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving public key";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
