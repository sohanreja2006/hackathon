import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";
import { PayloadManifest } from "@/payload/types";

/**
 * GET /api/payload/manifests?fileId=...
 * Retrieves manifest for local browser reconstruction & decryption.
 */
export async function GET(req: NextRequest) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ success: false, error: "Missing fileId parameter." }, { status: 400 });
  }

  const file = payloadService.getFile(fileId, auth.walletAddress);
  if (!file) {
    return NextResponse.json({ success: false, error: "File not found or access denied." }, { status: 404 });
  }

  const manifest = payloadService.getManifest(fileId);
  if (!manifest) {
    return NextResponse.json({ success: false, error: "Manifest not found for file." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    manifest,
  });
}

/**
 * POST /api/payload/manifests
 * Stores the manifest describing chunk CIDs and hashes.
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

  const { fileId, manifestCID, fileName, fileSize, mimeType, chunkSize, totalChunks, chunks } = body;
  if (!fileId || !manifestCID || !fileName || !Array.isArray(chunks)) {
    return NextResponse.json({ success: false, error: "Incomplete manifest data." }, { status: 400 });
  }

  const file = payloadService.getFile(fileId, auth.walletAddress);
  if (!file) {
    return NextResponse.json({ success: false, error: "File not found or access denied." }, { status: 404 });
  }

  const manifest: PayloadManifest = {
    id: `man_${Date.now()}`,
    fileId,
    manifestCID,
    fileName,
    fileSize: Number(fileSize) || file.size,
    mimeType: mimeType || file.mimeType,
    chunkSize: Number(chunkSize) || file.chunkSize,
    totalChunks: Number(totalChunks) || file.totalChunks,
    encryption: "AES-256-GCM",
    integrity: "SHA-256",
    chunks,
    createdAt: new Date().toISOString(),
  };

  const saved = payloadService.saveManifest(manifest);

  // Also update file record with manifestCID and mark as completed & verified
  payloadService.updateFile(
    fileId,
    {
      manifestCID,
      uploadStatus: "completed",
      integrityStatus: "verified",
    },
    auth.walletAddress
  );

  return NextResponse.json({
    success: true,
    manifest: saved,
  });
}
