import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

/**
 * GET /api/payload/chunks?fileId=...
 * Returns all uploaded chunks for a file to check progress or resume uploads.
 */
export async function GET(req: NextRequest) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ success: false, error: "Missing fileId." }, { status: 400 });
  }

  const file = payloadService.getFile(fileId, auth.walletAddress);
  if (!file) {
    return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
  }

  const chunks = payloadService.getChunks(fileId);

  return NextResponse.json({
    success: true,
    fileId,
    totalUploaded: chunks.length,
    chunks,
    uploadedIndices: chunks.map((c) => c.chunkIndex),
  });
}

/**
 * POST /api/payload/chunks
 * Records an encrypted chunk reference on IPFS in Payload.
 * Plaintext chunk data is NEVER sent here.
 */
export async function POST(req: NextRequest) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { fileId, chunkIndex, chunkSize, encryptedSize, iv, hash, cid, status } = body;
  if (!fileId || typeof chunkIndex !== "number" || !cid || !hash || !iv) {
    return NextResponse.json(
      { success: false, error: "Missing required chunk metadata fields." },
      { status: 400 }
    );
  }

  // Verify ownership of the target file
  const file = payloadService.getFile(fileId, auth.walletAddress);
  if (!file) {
    return NextResponse.json(
      { success: false, error: "File not found or access denied." },
      { status: 404 }
    );
  }

  const chunk = payloadService.recordChunk({
    fileId,
    chunkIndex,
    chunkSize: Number(chunkSize) || 0,
    encryptedSize: Number(encryptedSize) || 0,
    iv: String(iv),
    hash: String(hash),
    cid: String(cid),
    status: status || "uploaded",
  });

  return NextResponse.json({
    success: true,
    doc: chunk,
  });
}
