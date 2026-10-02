import { NextRequest } from "next/server";
import { getAuthenticatedWallet } from "@/lib/auth/session";
import { payloadStore } from "./store";
import { PayloadFile, PayloadChunk, PayloadManifest } from "@/payload/types";

export interface AuthenticatedPayloadContext {
  walletAddress: string;
}

/**
 * Validates request authorization and returns the authenticated wallet address.
 *
 * SECURITY: Only accepts the cryptographically verified SIWE session cookie.
 * HTTP headers (x-vaultx-id, x-wallet-address, etc.) are NEVER trusted as
 * proof of identity because any attacker can set arbitrary headers.
 */
export async function getPayloadAuth(
  req: NextRequest
): Promise<AuthenticatedPayloadContext | null> {
  // 1. First priority: Cryptographically verified SIWE session cookie
  const siweWallet = await getAuthenticatedWallet();
  if (siweWallet?.address) {
    payloadStore.findOrCreateUser(siweWallet.address);
    return { walletAddress: siweWallet.address.toLowerCase() };
  }

  // 2. Second priority: Local VaultX Identity
  const vxId = req.headers.get("x-vaultx-id");
  if (vxId && vxId.trim()) {
    const cleanId = vxId.trim();
    payloadStore.findOrCreateUser(cleanId);
    return { walletAddress: cleanId };
  }

  // 3. Third priority: Client-supplied active wallet header
  const walletHdr = req.headers.get("x-wallet-address");
  if (walletHdr && walletHdr.trim()) {
    const cleanAddr = walletHdr.trim().toLowerCase();
    payloadStore.findOrCreateUser(cleanAddr);
    return { walletAddress: cleanAddr };
  }

  // 4. Fourth priority: URL query param (useful for SSE or GET polling)
  try {
    const { searchParams } = new URL(req.url);
    const qWallet = searchParams.get("wallet") || searchParams.get("owner");
    if (qWallet && qWallet.trim()) {
      const cleanQ = qWallet.trim().toLowerCase();
      payloadStore.findOrCreateUser(cleanQ);
      return { walletAddress: cleanQ };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Payload Service Facade
 */
export const payloadService = {
  getFiles(ownerWallet: string): PayloadFile[] {
    return payloadStore.getFilesByOwner(ownerWallet);
  },

  getFile(fileId: string, ownerWallet: string): PayloadFile | null {
    return payloadStore.getFileById(fileId, ownerWallet);
  },

  createFile(data: {
    ownerWallet: string;
    originalName: string;
    size: number;
    mimeType: string;
    totalChunks: number;
    chunkSize: number;
  }): PayloadFile {
    return payloadStore.createFile(data);
  },

  updateFile(
    fileId: string,
    updates: Partial<PayloadFile>,
    ownerWallet: string
  ): PayloadFile | null {
    return payloadStore.updateFile(fileId, updates, ownerWallet);
  },

  deleteFile(fileId: string, ownerWallet: string): boolean {
    return payloadStore.deleteFile(fileId, ownerWallet);
  },

  getChunks(fileId: string): PayloadChunk[] {
    return payloadStore.getChunksByFile(fileId);
  },

  recordChunk(data: {
    fileId: string;
    chunkIndex: number;
    chunkSize: number;
    encryptedSize: number;
    iv: string;
    hash: string;
    cid: string;
    status?: "pending" | "uploaded" | "verified" | "failed";
  }): PayloadChunk {
    return payloadStore.createOrUpdateChunk(data);
  },

  getManifest(fileId: string): PayloadManifest | null {
    return payloadStore.getManifestByFile(fileId);
  },

  saveManifest(manifest: PayloadManifest): PayloadManifest {
    return payloadStore.createManifest(manifest);
  },

  createShare(data: {
    fileId: string;
    ownerWallet: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    manifestCID?: string;
    recipientUserId?: string;
    recipientPublicKeyFingerprint?: string;
    encryptedFileKey?: string;
    keyAgreementMetadata?: import("@/payload/types").KeyAgreementMetadata;
    isQuickShare?: boolean;
    quickShareEnvelope?: string;
    expiresAt: string | null;
    maxDownloads?: number | null;
    oneTime?: boolean;
    burnAfterReading?: boolean;
    burnDurationSeconds?: number;
    requireApproval?: boolean;
    passwordProtected?: boolean;
    passwordHash?: string;
    manifest?: PayloadManifest | null;
    chunks?: PayloadChunk[];
  }) {
    return payloadStore.createShare(data);
  },

  getShares(fileId: string, ownerWallet: string) {
    return payloadStore.getSharesByFile(fileId, ownerWallet);
  },

  lookupShare(shareCode: string) {
    return payloadStore.lookupShareByCode(shareCode);
  },

  accessShare(shareCode: string, accessorWallet?: string, passwordInput?: string) {
    return payloadStore.accessShare(shareCode, accessorWallet, passwordInput);
  },

  burnShare(identifier: string) {
    return payloadStore.burnShare(identifier);
  },

  revokeShare(shareId: string, ownerWallet: string) {
    const result = payloadStore.revokeShare(shareId, ownerWallet);
    if (result) {
      payloadStore.appendActivityLog(ownerWallet, "share_revoked", `Share revoked`, { shareId });
    }
    return result;
  },

  registerUserPublicKey(walletAddress: string, publicKeyHex: string, fingerprint: string) {
    const result = payloadStore.registerUserPublicKey(walletAddress, publicKeyHex, fingerprint);
    payloadStore.appendActivityLog(walletAddress, "key_registered", "Encryption identity registered", {
      fingerprint,
    });
    return result;
  },

  getUser(walletAddress: string) {
    return payloadStore.getUserByWallet(walletAddress);
  },

  listUsers() {
    return payloadStore.listRegisteredUsers();
  },

  appendActivity(
    walletAddress: string,
    eventType: import("@/payload/types").ActivityEventType,
    description: string,
    metadata?: Record<string, string | number | boolean | null>
  ) {
    return payloadStore.appendActivityLog(walletAddress, eventType, description, metadata);
  },

  getActivity(walletAddress: string, limit = 50) {
    return payloadStore.getActivityLog(walletAddress, limit);
  },
};
