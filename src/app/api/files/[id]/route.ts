import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { getFileRecord, deleteFileRecord, updateFileRecord } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/files/:id
 * Retrieve file metadata. Only the owner or an authorized recipient can view.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const file = await getFileRecord(id);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this file." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, file });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving file";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/files/:id
 * Update file status (e.g. pause, resume, etc.)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const file = await getFileRecord(id);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updated = await updateFileRecord(id, body);

    return NextResponse.json({ success: true, file: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error updating file";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/files/:id
 * Secure file deletion. Only owner can delete.
 * Marks file as deleted, invalidates all active shares, and logs event.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const file = await getFileRecord(id);
    if (!file || file.status === "deleted") {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    if (file.ownerWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only the file owner can delete this file." },
        { status: 403 }
      );
    }

    await deleteFileRecord(id);
    payloadStore.deleteFile(id, auth.walletAddress);

    payloadStore.appendActivity(
      auth.walletAddress,
      "file_deleted",
      `File ${file.filename} deleted and associated shares revoked`,
      { fileId: id }
    );

    return NextResponse.json({
      success: true,
      message: "File marked as deleted and all access grants revoked.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error deleting file";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
