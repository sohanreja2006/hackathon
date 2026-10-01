import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWallet } from "@/lib/auth/session";
import { createPinataSignedUploadUrl } from "@/lib/ipfs/pinata";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * POST /api/files/upload-url
 *
 * Secure pre-signed direct upload URL generator.
 *
 * Security:
 * - Requires verified SIWE wallet session.
 * - PINATA_JWT stays strictly server-side.
 * - Browser receives a time-limited (5 min) presigned URL.
 * - Rate limited per wallet/IP to protect bandwidth/quota.
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
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in with your wallet." },
      { status: 401 }
    );
  }

  const ip = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`upload_url:${wallet.address.toLowerCase()}:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: rateLimit.error || "Too many upload requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) } }
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
