import { NextRequest, NextResponse } from "next/server";
import { generateAuthNonce } from "@/lib/auth/nonce";
import { isAddress } from "viem";

/**
 * Nonce generation handler
 * Generates a cryptographically random, short-lived, single-use nonce for wallet signature.
 */
function createNonceResponse(address?: string) {
  if (address && !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  const nonce = generateAuthNonce(address || undefined);
  const now = new Date().toISOString();
  const normalized = address ? address.toLowerCase() : "";

  const message = address
    ? `Sign in to SecureVault\nWallet: ${normalized}\nNonce: ${nonce}\nIssued At: ${now}`
    : `Sign in to SecureVault\nNonce: ${nonce}\nIssued At: ${now}`;

  return NextResponse.json(
    {
      walletAddress: normalized,
      nonce,
      message,
      issuedAt: now,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

/**
 * POST /api/auth/nonce
 * Body: { walletAddress: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = body.walletAddress || body.address;
    return createNonceResponse(walletAddress);
  } catch {
    return NextResponse.json(
      { error: "Internal server error generating authentication nonce." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/nonce
 * Query: ?address=0x...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || searchParams.get("walletAddress");
    return createNonceResponse(address || undefined);
  } catch {
    return NextResponse.json(
      { error: "Internal server error generating authentication nonce." },
      { status: 500 }
    );
  }
}
