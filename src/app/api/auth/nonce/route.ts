import { NextRequest, NextResponse } from "next/server";
import { generateAuthNonce } from "@/lib/auth/nonce";
import { isAddress } from "viem";

/**
 * GET /api/auth/nonce
 * 
 * Generates a cryptographically random, single-use nonce for SIWE challenge.
 * Optional query parameter: ?address=0x... binds the nonce to a specific wallet.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    // If an address is provided, validate its format
    if (address && !isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format in query parameter." },
        { status: 400 }
      );
    }

    const nonce = generateAuthNonce(address || undefined);

    return NextResponse.json(
      {
        nonce,
        issuedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error generating authentication nonce." },
      { status: 500 }
    );
  }
}
