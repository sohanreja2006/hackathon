import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth, payloadService } from "@/lib/payload/client";
import { computeExpiresAt, hashSharePassword } from "@/lib/shareCode";
import { ShareExpirationOption } from "@/payload/types";

/**
 * GET /api/payload/shares?fileId=...
 * Lists all shares created for a specific file by the authenticated owner.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate your wallet." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId query parameter is required." },
        { status: 400 }
      );
    }

    const shares = payloadService.getShares(fileId, auth.walletAddress);
    return NextResponse.json({ success: true, shares });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch shares.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/payload/shares
 * Creates a new secure share code for a file (unlimited downloads).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate your wallet." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      fileId,
      fileName,
      fileSize,
      mimeType,
      manifestCID,
      cid,
      expirationOption = "24h",
      passwordProtected = false,
      password = "",
    } = body;

    const resolvedFileId = fileId || cid || manifestCID;
    if (!resolvedFileId) {
      return NextResponse.json(
        { success: false, error: "fileId or CID is required to create a share." },
        { status: 400 }
      );
    }

    // Calculate expiration
    const expiresAt = computeExpiresAt(expirationOption as ShareExpirationOption);

    // Hash password if enabled
    let passwordHash: string | undefined = undefined;
    if (passwordProtected && password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await hashSharePassword(password.trim());
    }

    const newShare = payloadService.createShare({
      fileId: resolvedFileId,
      ownerWallet: auth.walletAddress,
      fileName,
      fileSize,
      mimeType,
      manifestCID: manifestCID || cid || "",
      expiresAt,
      passwordProtected: Boolean(passwordProtected && passwordHash),
      passwordHash,
    });

    if (!newShare) {
      return NextResponse.json(
        { success: false, error: "Failed to generate share code." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, share: newShare }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create share.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
