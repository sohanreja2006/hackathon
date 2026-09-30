import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * GET /api/payload/files
 * Retrieves files belonging to the authenticated wallet.
 * Scoped strictly to ownerWallet == authenticatedWallet.
 */
export async function GET(req: NextRequest) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please authenticate your wallet." },
      { status: 401 }
    );
  }

  const files = payloadService.getFiles(auth.walletAddress);
  return NextResponse.json({
    success: true,
    total: files.length,
    docs: files,
  });
}

/**
 * POST /api/payload/files
 * Initiates a new file upload record in Payload.
 * Plaintext files are NEVER uploaded here.
 */
export async function POST(req: NextRequest) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please authenticate your wallet." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { originalName, size, mimeType, totalChunks, chunkSize } = body;
  if (!originalName || typeof size !== "number") {
    return NextResponse.json(
      { success: false, error: "Missing required fields: originalName, size." },
      { status: 400 }
    );
  }

  const file = payloadService.createFile({
    ownerWallet: auth.walletAddress,
    originalName: String(originalName).trim(),
    size,
    mimeType: mimeType || "application/octet-stream",
    totalChunks: Number(totalChunks) || 1,
    chunkSize: Number(chunkSize) || 8388608,
  });

  return NextResponse.json({
    success: true,
    doc: file,
  });
}
