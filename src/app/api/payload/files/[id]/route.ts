import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payload/files/[id]
 * Retrieves file record and its chunk map.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const file = payloadService.getFile(id, auth.walletAddress);
  if (!file) {
    return NextResponse.json(
      { success: false, error: "File not found or access denied." },
      { status: 404 }
    );
  }

  const chunks = payloadService.getChunks(id);

  return NextResponse.json({
    success: true,
    doc: file,
    chunks,
  });
}

/**
 * PATCH /api/payload/files/[id]
 * Updates file status (e.g. uploading, paused, verifying, completed).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const allowedUpdates = [
    "uploadStatus",
    "integrityStatus",
    "manifestCID",
    "totalChunks",
  ];

  const filteredUpdates: Record<string, unknown> = {};
  for (const key of allowedUpdates) {
    if (key in body) {
      filteredUpdates[key] = body[key];
    }
  }

  const updated = payloadService.updateFile(id, filteredUpdates, auth.walletAddress);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "File not found or access denied." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    doc: updated,
  });
}

/**
 * DELETE /api/payload/files/[id]
 * Removes file record and chunk entries from Payload.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getPayloadAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const deleted = payloadService.deleteFile(id, auth.walletAddress);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "File not found or access denied." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "File removed from registry." });
}
