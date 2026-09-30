import { NextRequest } from "next/server";
import { getAuthenticatedWallet } from "@/lib/auth/session";
import { payloadStore } from "./store";
import { PayloadFile, PayloadChunk, PayloadManifest } from "@/payload/types";

export interface AuthenticatedPayloadContext {
  walletAddress: string;
}

/**
 * Validates request authorization and returns the authenticated wallet address.
 * Supports:
 * 1. Cryptographic SIWE cookie session
 * 2. In-browser VaultX Secure Wallet header ('x-vaultx-id')
 */
export async function getPayloadAuth(
  req: NextRequest
): Promise<AuthenticatedPayloadContext | null> {
  // Check SIWE session first
  const siweWallet = await getAuthenticatedWallet();
  if (siweWallet?.address) {
    // Record user activity
    payloadStore.findOrCreateUser(siweWallet.address);
    return { walletAddress: siweWallet.address.toLowerCase() };
  }

  // Check VaultX wallet identity header
  const vxId = req.headers.get("x-vaultx-id") || req.headers.get("x-vaultx-identity");
  if (vxId && /^VX-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/i.test(vxId.trim())) {
    const address = vxId.trim();
    payloadStore.findOrCreateUser(address, "VaultX-Local");
    return { walletAddress: address.toLowerCase() };
  }

  // Check x-wallet-address or x-owner-wallet header for Web3 wallets
  const walletHeader = req.headers.get("x-wallet-address") || req.headers.get("x-owner-wallet") || req.headers.get("x-user-address");
  if (walletHeader && /^0x[a-fA-F0-9]{40}$/i.test(walletHeader.trim())) {
    const address = walletHeader.trim().toLowerCase();
    payloadStore.findOrCreateUser(address, "Web3-Wallet");
    return { walletAddress: address };
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
    expiresAt: string | null;
    passwordProtected: boolean;
    passwordHash?: string;
  }) {
    return payloadStore.createShare(data);
  },

  getShares(fileId: string, ownerWallet: string) {
    return payloadStore.getSharesByFile(fileId, ownerWallet);
  },

  lookupShare(shareCode: string) {
    return payloadStore.lookupShareByCode(shareCode);
  },

  accessShare(shareCode: string, passwordInput?: string) {
    return payloadStore.accessShare(shareCode, passwordInput);
  },

  revokeShare(shareId: string, ownerWallet: string) {
    return payloadStore.revokeShare(shareId, ownerWallet);
  },
};

