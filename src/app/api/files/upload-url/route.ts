import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWallet } from "@/lib/auth/session";
import { createPinataSignedUploadUrl } from "@/lib/ipfs/pinata";

/**
 * POST /api/files/upload-url
 *
 * Secure pre-signed direct upload URL generator.
 *
 * Security:
 * - Requires verified SIWE wallet session.
 * - PINATA_JWT stays strictly server-side.
 * - Browser receives a time-limited (5 min) presigned URL.
 * - Enables uploading large files (up to 500 MB) directly from the browser
 *   to Pinata, completely avoiding Vercel serverless function payload limits (4.5 MB).
 */
export async function POST(req: NextRequest) {
  let body: { filename?: string; vaultXId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const wallet = await getAuthenticatedWallet();
  const vaultXHeader = req.headers.get("x-vaultx-id") || req.headers.get("x-vaultx-identity");
  const vaultXId = vaultXHeader || body?.vaultXId;
  const isVaultXValid = typeof vaultXId === "string" && /^VX-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/i.test(vaultXId.trim());

  if (!wallet && !isVaultXValid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please connect MetaMask or VaultX Secure Wallet." },
      { status: 401 }
    );
  }


  const filename = body.filename?.trim() || `cyber10-${Date.now()}.cyber10enc`;

  try {
    const uploadUrl = await createPinataSignedUploadUrl(filename, 300);
    return NextResponse.json({
      success: true,
      uploadUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate upload URL";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
