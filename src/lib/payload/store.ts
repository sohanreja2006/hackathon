import fs from "fs";
import path from "path";
import {
  PayloadUser,
  PayloadFile,
  PayloadChunk,
  PayloadManifest,
  PayloadShare,
  ShareStatus,
  FileUploadStatus,
  FileIntegrityStatus,
} from "@/payload/types";
import { generateShareCode, hashSharePassword } from "@/lib/shareCode";

interface PayloadDatabaseData {
  users: Record<string, PayloadUser>;
  files: Record<string, PayloadFile>;
  chunks: Record<string, PayloadChunk>;
  manifests: Record<string, PayloadManifest>;
  shares: Record<string, PayloadShare>;
}

// In-memory cache for fast operations
let memoryDb: PayloadDatabaseData = {
  users: {},
  files: {},
  chunks: {},
  manifests: {},
  shares: {},
};

let isLoaded = false;

// Resolve persistence file path safely
function getStoreFilePath(): string {
  // Use .payload-store.json in project root, or /tmp if read-only
  try {
    const primaryPath = path.join(process.cwd(), ".payload-store.json");
    // Test write accessibility
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
  if (isLoaded) return;
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        memoryDb = {
          users: parsed.users || {},
          files: parsed.files || {},
          chunks: parsed.chunks || {},
          manifests: parsed.manifests || {},
          shares: parsed.shares || {},
        };
      }
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
    return memoryDb.manifests[fileId] || null;
  },

  // ── SHARES ────────────────────────────────────────────────────────────
  createShare(data: {
    fileId: string;
    ownerWallet: string;
    expiresAt: string | null;
    maxDownloads: number | null;
    oneTime: boolean;
    passwordProtected: boolean;
    passwordHash?: string;
  }): PayloadShare | null {
    loadStore();
    const file = this.getFileById(data.fileId, data.ownerWallet);
    if (!file) return null;

    const shareId = `shr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareCode = generateShareCode();
    const now = new Date().toISOString();

    const newShare: PayloadShare = {
      id: shareId,
      shareCode,
      fileId: file.id,
      fileName: file.originalName,
      fileSize: file.size,
      mimeType: file.mimeType,
      ownerWallet: data.ownerWallet.toLowerCase(),
      manifestCID: file.manifestCID || "",
      encryptionAlgorithm: "AES-256-GCM",
      integrityAlgorithm: "SHA-256",
      expiresAt: data.expiresAt,
      maxDownloads: data.maxDownloads,
      downloadCount: 0,
      oneTime: data.oneTime,
      passwordProtected: data.passwordProtected,
      passwordHash: data.passwordHash,
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
      if (s.fileId !== fileId) return false;
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
    passwordInput?: string
  ): Promise<{
    success: boolean;
    share?: PayloadShare;
    manifest?: PayloadManifest | null;
    chunks?: PayloadChunk[];
    error?: string;
    status?: ShareStatus | "not-found";
  }> {
    loadStore();
    const { share, status } = this.lookupShareByCode(shareCode);
    if (!share) {
      return { success: false, status, error: `Share status: ${status}` };
    }

    // If password protected, verify password
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

    // Validated! Increment download count
    share.downloadCount += 1;
    share.lastAccessedAt = new Date().toISOString();

    if (share.oneTime || (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads)) {
      share.status = "download-limit-reached";
    }

    saveStore();

    const manifest = this.getManifestByFile(share.fileId);
    const chunks = this.getChunksByFile(share.fileId);

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
};
