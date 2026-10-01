import { NextRequest, NextResponse } from "next/server";
import { getPayloadAuth } from "@/lib/payload/client";
import { upsertUser } from "@/lib/payload/db";
import { payloadStore } from "@/lib/payload/store";

/**
 * PATCH /api/users/me/encryption-key
 *
 * Authenticated Public Key Registration:
 * Only the authenticated user can register their own public encryption key.
 * Input: { publicEncryptionKey: string, keyFingerprint?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getPayloadAuth(req);
    if (!auth?.walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { publicEncryptionKey, keyFingerprint } = body;

    if (!publicEncryptionKey || typeof publicEncryptionKey !== "string") {
      return NextResponse.json(
        { success: false, error: "publicEncryptionKey is required." },
        { status: 400 }
      );
    }

    // Update in persistent database
    const updated = await upsertUser(auth.walletAddress, {
      publicEncryptionKey: publicEncryptionKey.trim(),
      keyFingerprint: keyFingerprint ? String(keyFingerprint).trim() : undefined,
      lastAuthenticatedAt: new Date().toISOString(),
    });

    // Mirror to payloadStore cache
    payloadStore.registerUserPublicKey(
      auth.walletAddress,
      publicEncryptionKey.trim(),
      keyFingerprint ? String(keyFingerprint).trim() : ""
    );

    return NextResponse.json(
      {
        success: true,
        message: "Public encryption key registered successfully.",
        user: {
          walletAddress: updated.walletAddress,
          publicEncryptionKey: updated.publicEncryptionKey,
          keyFingerprint: updated.keyFingerprint,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error registering public key";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
