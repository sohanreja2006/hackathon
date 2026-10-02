import fs from "fs";
import path from "path";
import {
  PayloadUser,
  PayloadFile,
  PayloadChunk,
  PayloadManifest,
  PayloadShare,
  PayloadActivityLog,
  ActivityEventType,
  ShareStatus,
  FileUploadStatus,
  FileIntegrityStatus,
} from "@/payload/types";
import { generateShareCode, hashSharePassword } from "@/lib/shareCode";
import { recordActivityLog } from "./db";

export interface AccessRequest {
  id: string;
  shareCode: string;
  fileId: string;
  fileName: string;
  ownerWallet: string;
  requesterAddress?: string;
  requesterNote?: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  resolvedAt?: string;
  accessToken?: string;
}

interface PayloadDatabaseData {
  users: Record<string, PayloadUser>;
  files: Record<string, PayloadFile>;
  chunks: Record<string, PayloadChunk>;
  manifests: Record<string, PayloadManifest>;
  shares: Record<string, PayloadShare>;
  activity: PayloadActivityLog[];
  accessRequests: Record<string, AccessRequest>;
}

// In-memory cache for fast operations
let memoryDb: PayloadDatabaseData = {
  users: {},
  files: {},
  chunks: {},
  manifests: {},
  shares: {},
  activity: [],
  accessRequests: {},
};

let isLoaded = false;
let lastMtimeMs = 0;

// Resolve persistence file path safely
function getStoreFilePath(): string {
  try {
    const primaryPath = path.join(process.cwd(), ".payload-store.json");
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }
    fs.writeFileSync(primaryPath, JSON.stringify(memoryDb), { flag: "a" });
    return primaryPath;
  } catch {
    return path.join("/tmp", "payload-store.json");
  }
}

function loadStore(): void {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (isLoaded && stat.mtimeMs <= lastMtimeMs) {
        return;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        memoryDb = {
          users: parsed.users || {},
          files: parsed.files || {},
          chunks: parsed.chunks || {},
          manifests: parsed.manifests || {},
          shares: parsed.shares || {},
          activity: parsed.activity || [],
          accessRequests: parsed.accessRequests || {},
        };
      }
      lastMtimeMs = stat.mtimeMs;
    }
  } catch (err) {
    console.warn("Payload store: error loading local storage, using memory:", err);
  }
  isLoaded = true;
}

function saveStore(): void {
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(memoryDb, null, 2), "utf-8");
    try {
      lastMtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      lastMtimeMs = Date.now();
    }
  } catch (err) {
    console.warn("Payload store: unable to persist to disk (serverless environment):", err);
  }
}

/**
 * Payload CMS Client / Store Engine
 */
export const payloadStore = {
  // ── USERS ─────────────────────────────────────────────────────────────
  findOrCreateUser(walletAddress: string, network = "Sepolia"): PayloadUser {
    loadStore();
    const normalized = walletAddress.toLowerCase();
    const existing = Object.values(memoryDb.users).find(
      (u) => u.walletAddress.toLowerCase() === normalized
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.lastAuthenticatedAt = now;
      saveStore();
      return existing;
    }

    const newUser: PayloadUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletAddress,
      network,
      createdAt: now,
      lastAuthenticatedAt: now,
    };

    memoryDb.users[newUser.id] = newUser;
    saveStore();
    return newUser;
  },

  registerUserPublicKey(
    walletAddress: string,
    publicKeyHex: string,
    publicKeyFingerprint: string
  ): PayloadUser {
    loadStore();
    const user = this.findOrCreateUser(walletAddress);
    user.publicEncryptionKey = publicKeyHex;
    user.publicKeyFingerprint = publicKeyFingerprint;
    user.lastAuthenticatedAt = new Date().toISOString();
    saveStore();
    return user;
  },

  getUserByWallet(walletAddress: string): PayloadUser | null {
    loadStore();
    const normalized = walletAddress.toLowerCase();
    return (
      Object.values(memoryDb.users).find(
        (u) => u.walletAddress.toLowerCase() === normalized
      ) || null
    );
  },

  listRegisteredUsers(): Array<{
    walletAddress: string;
    publicKeyFingerprint?: string;
    publicEncryptionKey?: string;
    network?: string;
  }> {
    loadStore();
    return Object.values(memoryDb.users).map((u) => ({
      walletAddress: u.walletAddress,
      publicKeyFingerprint: u.publicKeyFingerprint,
      publicEncryptionKey: u.publicEncryptionKey,
      network: u.network,
    }));
  },

  // ── FILES ─────────────────────────────────────────────────────────────
  createFile(data: {
    ownerWallet: string;
    originalName: string;
    size: number;
    mimeType: string;
    totalChunks: number;
    chunkSize: number;
    encryptionAlgorithm?: "AES-256-GCM";
    integrityAlgorithm?: "SHA-256";
    uploadStatus?: FileUploadStatus;
  }): PayloadFile {
    loadStore();
    const now = new Date().toISOString();
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const logicalPath = `/vault/${data.ownerWallet}/${fileId}/`;

    const newFile: PayloadFile = {
      id: fileId,
      ownerWallet: data.ownerWallet,
      originalName: data.originalName,
      size: data.size,
      mimeType: data.mimeType || "application/octet-stream",
      totalChunks: data.totalChunks || 1,
      chunkSize: data.chunkSize || 8388608,
      encryptionAlgorithm: data.encryptionAlgorithm || "AES-256-GCM",
      integrityAlgorithm: data.integrityAlgorithm || "SHA-256",
      uploadStatus: data.uploadStatus || "pending",
      integrityStatus: "pending",
      logicalPath,
      createdAt: now,
      updatedAt: now,
    };

    memoryDb.files[fileId] = newFile;
    saveStore();
    return newFile;
  },

  getFilesByOwner(walletAddress: string): PayloadFile[] {
    loadStore();
    const normalized = walletAddress.toLowerCase();
    return Object.values(memoryDb.files)
      .filter((f) => f.ownerWallet.toLowerCase() === normalized)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getFileById(fileId: string, expectedOwner?: string): PayloadFile | null {
    loadStore();
    const file = memoryDb.files[fileId] || null;
    if (!file) return null;
    if (expectedOwner && file.ownerWallet.toLowerCase() !== expectedOwner.toLowerCase()) {
      return null;
    }
    return file;
  },

  updateFile(
    fileId: string,
    updates: Partial<PayloadFile>,
    expectedOwner?: string
  ): PayloadFile | null {
    loadStore();
    const file = this.getFileById(fileId, expectedOwner);
    if (!file) return null;

    Object.assign(file, updates, { updatedAt: new Date().toISOString() });
    memoryDb.files[fileId] = file;
    saveStore();
    return file;
  },

  deleteFile(fileId: string, expectedOwner?: string): boolean {
    loadStore();
    const file = this.getFileById(fileId, expectedOwner);
    if (!file) return false;

    delete memoryDb.files[fileId];

    // Delete associated chunks
    for (const [chunkId, chunk] of Object.entries(memoryDb.chunks)) {
      if (chunk.fileId === fileId) {
        delete memoryDb.chunks[chunkId];
      }
    }

    // Delete associated manifests
    for (const [manId, manifest] of Object.entries(memoryDb.manifests)) {
      if (manifest.fileId === fileId) {
        delete memoryDb.manifests[manId];
      }
    }

    saveStore();
    return true;
  },

  // ── CHUNKS ────────────────────────────────────────────────────────────
  createOrUpdateChunk(data: {
    fileId: string;
    chunkIndex: number;
    chunkSize: number;
    encryptedSize: number;
    iv: string;
    hash: string;
    cid: string;
    status?: "pending" | "uploaded" | "verified" | "failed";
  }): PayloadChunk {
    loadStore();
    const chunkKey = `${data.fileId}_chunk_${data.chunkIndex}`;
    const now = new Date().toISOString();

    const chunk: PayloadChunk = {
      id: chunkKey,
      fileId: data.fileId,
      chunkIndex: data.chunkIndex,
      chunkSize: data.chunkSize,
      encryptedSize: data.encryptedSize,
      iv: data.iv,
      hash: data.hash,
      cid: data.cid,
      status: data.status || "uploaded",
      uploadedAt: now,
    };

    memoryDb.chunks[chunkKey] = chunk;
    saveStore();
    return chunk;
  },

  getChunksByFile(fileId: string): PayloadChunk[] {
    loadStore();
    return Object.values(memoryDb.chunks)
      .filter((c) => c.fileId === fileId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  },

  // ── MANIFESTS ─────────────────────────────────────────────────────────
  createManifest(manifest: PayloadManifest): PayloadManifest {
    loadStore();
    memoryDb.manifests[manifest.fileId] = manifest;
    saveStore();
    return manifest;
  },

  getManifestByFile(fileId: string): PayloadManifest | null {
    loadStore();
    if (!fileId) return null;
    if (memoryDb.manifests[fileId]) return memoryDb.manifests[fileId];
    return (
      Object.values(memoryDb.manifests).find(
        (m) => m.fileId === fileId || m.manifestCID === fileId || m.id === fileId
      ) || null
    );
  },

  // ── SHARES ────────────────────────────────────────────────────────────
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
  }): PayloadShare | null {
    loadStore();
    let file = this.getFileById(data.fileId);
    if (!file && data.manifestCID) {
      file = Object.values(memoryDb.files).find(
        (f) => f.manifestCID === data.manifestCID || f.id === data.fileId
      ) || null;
    }

    const fileName = file?.originalName || data.fileName || "Encrypted File";
    const fileSize = file?.size || data.fileSize || 0;
    const mimeType = file?.mimeType || data.mimeType || "application/octet-stream";
    const manifestCID = file?.manifestCID || data.manifestCID || "";

    if (!file) {
      file = {
        id: data.fileId || `file_${Date.now()}`,
        ownerWallet: data.ownerWallet.toLowerCase(),
        originalName: fileName,
        size: fileSize,
        mimeType,
        totalChunks: 1,
        chunkSize: 8388608,
        encryptionAlgorithm: "AES-256-GCM",
        integrityAlgorithm: "SHA-256",
        manifestCID,
        uploadStatus: "completed",
        integrityStatus: "verified",
        logicalPath: `/vault/${data.ownerWallet}/${data.fileId}/`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryDb.files[file.id] = file;
    }

    // If manifest was passed with share, store it
    if (data.manifest) {
      memoryDb.manifests[data.manifest.fileId] = data.manifest;
      if (data.manifest.manifestCID) {
        memoryDb.manifests[data.manifest.manifestCID] = data.manifest;
      }
    }

    // If chunks were passed with share, store them
    if (Array.isArray(data.chunks)) {
      for (const c of data.chunks) {
        const cId = c.id || `${file.id}_chunk_${c.chunkIndex ?? 0}`;
        memoryDb.chunks[cId] = { ...c, fileId: file.id };
      }
    }

    const shareId = `shr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareCode = generateShareCode();
    const now = new Date().toISOString();

    const newShare: PayloadShare = {
      id: shareId,
      shareId,
      shareCode,
      fileId: file.id,
      fileName,
      fileSize,
      mimeType,
      ownerWallet: data.ownerWallet.toLowerCase(),
      manifestCID,
      recipientUserId: data.recipientUserId ? data.recipientUserId.toLowerCase() : undefined,
      recipientPublicKeyFingerprint: data.recipientPublicKeyFingerprint,
      encryptedFileKey: data.encryptedFileKey,
      keyAgreementMetadata: data.keyAgreementMetadata,
      isQuickShare: Boolean(data.isQuickShare),
      quickShareEnvelope: data.quickShareEnvelope,
      encryptionAlgorithm: "AES-256-GCM",
      integrityAlgorithm: "SHA-256",
      expiresAt: data.expiresAt,
      maxDownloads: data.maxDownloads !== undefined ? data.maxDownloads : null,
      downloadCount: 0,
      oneTime: Boolean(data.oneTime),
      burnAfterReading: Boolean(data.burnAfterReading),
      burnDurationSeconds: data.burnDurationSeconds !== undefined ? Number(data.burnDurationSeconds) : 60,
      requireApproval: Boolean(data.requireApproval),
      passwordProtected: Boolean(data.passwordProtected),
      passwordHash: data.passwordHash,
      manifest: data.manifest || null,
      chunks: data.chunks || undefined,
      status: "active",
      createdAt: now,
    };

    memoryDb.shares[shareId] = newShare;
    saveStore();
    return newShare;
  },

  getSharesByFile(fileId: string, expectedOwner?: string): PayloadShare[] {
    loadStore();
    const now = new Date();
    let hasUpdated = false;

    const results = Object.values(memoryDb.shares).filter((s) => {
      if (s.fileId !== fileId && s.manifestCID !== fileId) return false;
      if (expectedOwner && s.ownerWallet.toLowerCase() !== expectedOwner.toLowerCase()) {
        return false;
      }

      // Check auto-expiration
      if (s.status === "active" && s.expiresAt && new Date(s.expiresAt) <= now) {
        s.status = "expired";
        hasUpdated = true;
      }

      return true;
    });

    if (hasUpdated) {
      saveStore();
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  lookupShareByCode(shareCode: string): {
    share: PayloadShare | null;
    status: ShareStatus | "not-found";
  } {
    loadStore();
    const normalized = shareCode.trim().toUpperCase();
    const share = Object.values(memoryDb.shares).find(
      (s) => s.shareCode.toUpperCase() === normalized
    );

    if (!share) {
      return { share: null, status: "not-found" };
    }

    const now = new Date();
    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) <= now) {
      if (share.status === "active") {
        share.status = "expired";
        saveStore();
      }
      return { share: null, status: "expired" };
    }

    // Check download limit
    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      if (share.status === "active") {
        share.status = "download-limit-reached";
        saveStore();
      }
      return { share: null, status: "download-limit-reached" };
    }

    if (share.status !== "active") {
      return { share: null, status: share.status };
    }

    return { share, status: "active" };
  },

  async accessShare(
    shareCode: string,
    accessorWallet?: string,
    passwordInput?: string
  ): Promise<{
    success: boolean;
    share?: PayloadShare;
    manifest?: PayloadManifest | null;
    chunks?: PayloadChunk[];
    error?: string;
    status?: ShareStatus | "not-found" | "unauthorized";
  }> {
    loadStore();
    const { share, status } = this.lookupShareByCode(shareCode);
    if (!share) {
      return { success: false, status, error: `Share status: ${status}` };
    }

    // Recipient-specific E2EE Authorization Check
    if (share.recipientUserId) {
      if (!accessorWallet) {
        return {
          success: false,
          status: "unauthorized",
          error: "Recipient authentication required. Please connect the designated wallet to access this file.",
        };
      }

      if (accessorWallet.toLowerCase() !== share.recipientUserId.toLowerCase()) {
        return {
          success: false,
          status: "unauthorized",
          error: `Access denied. This file was encrypted specifically for ${share.recipientUserId.slice(0, 6)}...${share.recipientUserId.slice(-4)}. Your connected wallet (${accessorWallet.slice(0, 6)}...${accessorWallet.slice(-4)}) is not authorized.`,
        };
      }
    }

    // Check password if set
    if (share.passwordProtected) {
      if (!passwordInput) {
        return {
          success: false,
          status: "active",
          error: "Password is required to access this file.",
        };
      }
      const hashed = await hashSharePassword(passwordInput);
      if (hashed !== share.passwordHash) {
        return {
          success: false,
          status: "active",
          error: "Incorrect password for this secure share.",
        };
      }
    }

    // Check download limit
    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      share.status = "download-limit-reached";
      saveStore();
      return {
        success: false,
        status: "download-limit-reached",
        error: "Download limit reached for this share.",
      };
    }

    // Increment download count
    share.downloadCount += 1;
    share.lastAccessedAt = new Date().toISOString();

    // If one-time access, revoke after this download
    if (share.oneTime) {
      share.status = "download-limit-reached";
    }

    saveStore();

    let manifest = share.manifest || this.getManifestByFile(share.fileId);
    if (!manifest && share.manifestCID) {
      manifest = this.getManifestByFile(share.manifestCID);
    }
    if (!manifest && share.manifestCID) {
      manifest = Object.values(memoryDb.manifests).find(
        (m) => m.manifestCID === share.manifestCID || m.fileId === share.fileId
      ) || null;
    }

    let chunks = (share.chunks && share.chunks.length > 0)
      ? share.chunks
      : this.getChunksByFile(share.fileId);

    if ((!chunks || chunks.length === 0) && share.manifestCID) {
      chunks = this.getChunksByFile(share.manifestCID);
    }
    if ((!chunks || chunks.length === 0) && manifest) {
      chunks = this.getChunksByFile(manifest.fileId);
    }
    if ((!chunks || chunks.length === 0) && manifest?.chunks && manifest.chunks.length > 0) {
      chunks = manifest.chunks.map((mc, idx) => ({
        id: `${share.fileId}_chunk_${idx}`,
        fileId: share.fileId,
        chunkIndex: mc.index,
        chunkSize: mc.size || 8388608,
        encryptedSize: mc.size || 8388608,
        iv: mc.iv || "",
        hash: mc.hash || (mc as { sha256?: string }).sha256 || "",
        cid: mc.cid,
        status: "uploaded",
        uploadedAt: share.createdAt,
      }));
    }

    // Resilient fallback: If still no chunks, but share has manifestCID or cid:
    const shareCid = (share as { cid?: string }).cid;
    if ((!chunks || chunks.length === 0) && (share.manifestCID || shareCid)) {
      const fallbackCid = share.manifestCID || shareCid || "";
      chunks = [
        {
          id: `${share.fileId}_chunk_0`,
          fileId: share.fileId,
          chunkIndex: 0,
          chunkSize: share.fileSize || 8388608,
          encryptedSize: share.fileSize || 8388608,
          iv: "",
          hash: "",
          cid: fallbackCid,
          status: "uploaded",
          uploadedAt: share.createdAt,
        },
      ];
    }

    return {
      success: true,
      share,
      manifest,
      chunks,
    };
  },

  revokeShare(shareId: string, expectedOwner: string): boolean {
    loadStore();
    const share = memoryDb.shares[shareId];
    if (!share) return false;
    if (share.ownerWallet.toLowerCase() !== expectedOwner.toLowerCase()) {
      return false;
    }

    share.status = "revoked";
    saveStore();
    return true;
  },

  burnShare(identifier: string): { success: boolean; error?: string } {
    loadStore();
    const normalized = identifier.trim().toUpperCase();
    const share = Object.values(memoryDb.shares).find(
      (s) => s.id === identifier || s.shareCode.toUpperCase() === normalized
    );

    if (!share) {
      return { success: false, error: "Share not found." };
    }

    share.status = "revoked";
    share.lastAccessedAt = new Date().toISOString();
    // Cryptographically purge envelopes on server
    share.encryptedFileKey = "";
    share.quickShareEnvelope = undefined;
    saveStore();

    try {
      this.appendActivityLog(
        share.ownerWallet,
        "share_burned",
        `Share ${share.shareCode} self-destructed upon completion of reading`,
        { shareCode: share.shareCode, fileId: share.fileId }
      );
    } catch {
      // Non-fatal
    }

    return { success: true };
  },

  // ── ACTIVITY LOG ──────────────────────────────────────────────────────
  appendActivityLog(
    walletAddress: string,
    eventType: ActivityEventType,
    description: string,
    metadata?: Record<string, string | number | boolean | null>
  ): PayloadActivityLog {
    loadStore();
    const entry: PayloadActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletAddress: walletAddress.toLowerCase(),
      eventType,
      description,
      metadata,
      timestamp: new Date().toISOString(),
    };
    // Keep at most 500 entries per store to avoid unbounded growth
    memoryDb.activity.push(entry);
    if (memoryDb.activity.length > 500) {
      memoryDb.activity = memoryDb.activity.slice(-500);
    }
    saveStore();

    recordActivityLog({
      userWallet: walletAddress,
      action: eventType,
      metadata: metadata || undefined,
    }).catch(() => {});

    return entry;
  },

  getActivityLog(
    walletAddress: string,
    limit = 50
  ): PayloadActivityLog[] {
    loadStore();
    const normalized = walletAddress.toLowerCase();
    return memoryDb.activity
      .filter((e) => e.walletAddress === normalized)
      .slice(-limit)
      .reverse();
  },

  appendActivity(
    walletAddress: string,
    eventType: ActivityEventType | string,
    description: string,
    metadata?: Record<string, unknown>
  ): PayloadActivityLog {
    return this.appendActivityLog(
      walletAddress,
      eventType as ActivityEventType,
      description,
      metadata as Record<string, string | number | boolean | null>
    );
  },

  getShareById(shareId: string): PayloadShare | null {
    loadStore();
    return memoryDb.shares[shareId] || null;
  },

  getSharesByOwner(ownerWallet: string): PayloadShare[] {
    loadStore();
    const normalized = ownerWallet.toLowerCase();
    return Object.values(memoryDb.shares)
      .filter((s) => s.ownerWallet.toLowerCase() === normalized)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getUser(walletAddress: string): PayloadUser | null {
    return this.getUserByWallet(walletAddress);
  },

  // ── ACCESS REQUESTS ───────────────────────────────────────────────────
  createAccessRequest(data: {
    shareCode: string;
    fileId: string;
    fileName: string;
    ownerWallet: string;
    requesterAddress?: string;
    requesterNote?: string;
  }): AccessRequest {
    loadStore();
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const req: AccessRequest = {
      id,
      shareCode: data.shareCode,
      fileId: data.fileId,
      fileName: data.fileName,
      ownerWallet: data.ownerWallet.toLowerCase(),
      requesterAddress: data.requesterAddress?.toLowerCase(),
      requesterNote: data.requesterNote,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    memoryDb.accessRequests[id] = req;
    saveStore();
    return req;
  },

  getAccessRequest(requestId: string): AccessRequest | null {
    loadStore();
    return memoryDb.accessRequests[requestId] || null;
  },

  getAccessRequestByToken(token: string): AccessRequest | null {
    loadStore();
    return Object.values(memoryDb.accessRequests).find(
      (r) => r.accessToken === token && r.status === "approved"
    ) || null;
  },

  getPendingRequestsForOwner(ownerWallet: string): AccessRequest[] {
    loadStore();
    const normalized = ownerWallet.toLowerCase();
    return Object.values(memoryDb.accessRequests)
      .filter((r) => r.ownerWallet === normalized)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  },

  approveAccessRequest(requestId: string, ownerWallet: string): AccessRequest | null {
    loadStore();
    const req = memoryDb.accessRequests[requestId];
    if (!req) return null;
    if (req.ownerWallet !== ownerWallet.toLowerCase()) return null;
    req.status = "approved";
    req.resolvedAt = new Date().toISOString();
    req.accessToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    saveStore();
    return req;
  },

  denyAccessRequest(requestId: string, ownerWallet: string): AccessRequest | null {
    loadStore();
    const req = memoryDb.accessRequests[requestId];
    if (!req) return null;
    if (req.ownerWallet !== ownerWallet.toLowerCase()) return null;
    req.status = "denied";
    req.resolvedAt = new Date().toISOString();
    saveStore();
    return req;
  },

  pollAccessRequest(requestId: string): { status: AccessRequest["status"]; accessToken?: string } | null {
    loadStore();
    const req = memoryDb.accessRequests[requestId];
    if (!req) return null;
    return { status: req.status, accessToken: req.accessToken };
  },
};
