import fs from "fs";
import path from "path";
import { Pool } from "pg";

export interface DBUser {
  id: string;
  walletAddress: string;
  network?: string;
  publicEncryptionKey?: string;
  keyFingerprint?: string;
  status: "active" | "suspended";
  lastAuthenticatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBFile {
  id: string;
  fileId: string;
  ownerWallet: string;
  filename: string;
  size: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  encryptionAlgorithm: "AES-256-GCM";
  integrityAlgorithm: "SHA-256";
  manifestCID?: string;
  status:
    | "preparing"
    | "encrypting"
    | "uploading"
    | "paused"
    | "verifying"
    | "complete"
    | "failed"
    | "deleted";
  logicalPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  ipfsCID: string;
  sha256: string;
  iv: string;
  encryptedSize: number;
  status: "pending" | "uploaded" | "verified" | "failed";
  createdAt: string;
}

export interface DBShare {
  id: string;
  shareId: string;
  fileId: string;
  ownerWallet: string;
  recipient: string;
  recipientPublicKeyFingerprint?: string;
  encryptedFileKey: string;
  keyAgreementMetadata?: Record<string, unknown>;
  expiresAt?: string;
  maxDownloads: number;
  downloadCount: number;
  oneTime: boolean;
  status: "active" | "expired" | "revoked" | "download-limit-reached";
  createdAt: string;
  lastAccessedAt?: string;
}

export interface DBActivity {
  id: string;
  userWallet: string;
  fileId?: string;
  shareId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface DBSnapshot {
  users: Record<string, DBUser>;
  files: Record<string, DBFile>;
  chunks: Record<string, DBChunk>;
  shares: Record<string, DBShare>;
  activity: DBActivity[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistent Database Store (PostgreSQL with File-Backed Durability Fallback)
// ─────────────────────────────────────────────────────────────────────────────

let pgPool: Pool | null = null;
let pgConnected = false;

function getFallbackFilePath(): string {
  try {
    const primary = path.join(process.cwd(), ".payload-db.json");
    if (!fs.existsSync(primary)) {
      const init: DBSnapshot = { users: {}, files: {}, chunks: {}, shares: {}, activity: [] };
      fs.writeFileSync(primary, JSON.stringify(init, null, 2), "utf-8");
    }
    return primary;
  } catch {
    return path.join("/tmp", ".payload-db.json");
  }
}

function readSnapshot(): DBSnapshot {
  try {
    const filePath = getFallbackFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.trim()) return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  return { users: {}, files: {}, chunks: {}, shares: {}, activity: [] };
}

function writeSnapshot(data: DBSnapshot): void {
  try {
    const filePath = getFallbackFilePath();
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.warn("[Payload DB] Persistent write fallback error:", err);
  }
}

export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return;
  }

  if (pgPool) return;

  try {
    pgPool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pgPool.connect();
    try {
      // Run initial migrations
      const migrationPath = path.join(
        process.cwd(),
        "src/payload/migrations/0001_initial_schema.sql"
      );
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, "utf-8");
        await client.query(sql);
      }
      pgConnected = true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(
      "[Payload DB] PostgreSQL connection failed. Falling back to persistent store:",
      err instanceof Error ? err.message : err
    );
    pgConnected = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Repository
// ─────────────────────────────────────────────────────────────────────────────

export async function findUserByWallet(walletAddress: string): Promise<DBUser | null> {
  const normalized = walletAddress.toLowerCase();
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        "SELECT * FROM users WHERE LOWER(wallet_address) = $1 LIMIT 1",
        [normalized]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          walletAddress: r.wallet_address,
          network: r.network,
          publicEncryptionKey: r.public_encryption_key,
          keyFingerprint: r.key_fingerprint,
          status: r.status,
          lastAuthenticatedAt: r.last_authenticated_at?.toISOString() || new Date().toISOString(),
          createdAt: r.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
        };
      }
      return null;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  const found = Object.values(snap.users).find(
    (u) => u.walletAddress.toLowerCase() === normalized
  );
  return found || null;
}

export async function upsertUser(
  walletAddress: string,
  updates: Partial<DBUser> = {}
): Promise<DBUser> {
  const normalized = walletAddress.toLowerCase();
  const now = new Date().toISOString();
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const id = updates.id || `usr_${normalized.slice(2, 10)}_${Date.now()}`;
      const res = await pgPool.query(
        `INSERT INTO users (id, wallet_address, network, public_encryption_key, key_fingerprint, status, last_authenticated_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (wallet_address) DO UPDATE SET
           last_authenticated_at = EXCLUDED.last_authenticated_at,
           updated_at = EXCLUDED.updated_at,
           public_encryption_key = COALESCE(EXCLUDED.public_encryption_key, users.public_encryption_key),
           key_fingerprint = COALESCE(EXCLUDED.key_fingerprint, users.key_fingerprint)
         RETURNING *`,
        [
          id,
          normalized,
          updates.network || "Sepolia",
          updates.publicEncryptionKey || null,
          updates.keyFingerprint || null,
          updates.status || "active",
          updates.lastAuthenticatedAt || now,
          now,
          now,
        ]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        walletAddress: r.wallet_address,
        network: r.network,
        publicEncryptionKey: r.public_encryption_key,
        keyFingerprint: r.key_fingerprint,
        status: r.status,
        lastAuthenticatedAt: r.last_authenticated_at?.toISOString() || now,
        createdAt: r.created_at?.toISOString() || now,
        updatedAt: r.updated_at?.toISOString() || now,
      };
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  const existing = Object.values(snap.users).find(
    (u) => u.walletAddress.toLowerCase() === normalized
  );

  if (existing) {
    const updated: DBUser = {
      ...existing,
      ...updates,
      walletAddress: normalized,
      lastAuthenticatedAt: updates.lastAuthenticatedAt || now,
      updatedAt: now,
    };
    snap.users[existing.id] = updated;
    writeSnapshot(snap);
    return updated;
  }

  const id = `usr_${normalized.slice(2, 10)}_${Date.now()}`;
  const newUser: DBUser = {
    id,
    walletAddress: normalized,
    network: updates.network || "Sepolia",
    publicEncryptionKey: updates.publicEncryptionKey,
    keyFingerprint: updates.keyFingerprint,
    status: updates.status || "active",
    lastAuthenticatedAt: updates.lastAuthenticatedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  snap.users[id] = newUser;
  writeSnapshot(snap);
  return newUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// Files Repository
// ─────────────────────────────────────────────────────────────────────────────

export async function createFileRecord(data: {
  fileId: string;
  ownerWallet: string;
  filename: string;
  size: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  encryptionAlgorithm?: "AES-256-GCM";
  integrityAlgorithm?: "SHA-256";
  manifestCID?: string;
  logicalPath?: string;
}): Promise<DBFile> {
  const now = new Date().toISOString();
  const normalizedOwner = data.ownerWallet.toLowerCase();
  const id = `fil_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const record: DBFile = {
    id,
    fileId: data.fileId,
    ownerWallet: normalizedOwner,
    filename: data.filename,
    size: data.size,
    mimeType: data.mimeType,
    chunkSize: data.chunkSize || 8388608,
    totalChunks: data.totalChunks || 1,
    encryptionAlgorithm: data.encryptionAlgorithm || "AES-256-GCM",
    integrityAlgorithm: data.integrityAlgorithm || "SHA-256",
    manifestCID: data.manifestCID,
    status: "preparing",
    logicalPath: data.logicalPath || `/vault/${normalizedOwner}/${data.fileId}/`,
    createdAt: now,
    updatedAt: now,
  };

  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO files (id, file_id, owner_wallet, filename, size, mime_type, chunk_size, total_chunks, encryption_algorithm, integrity_algorithm, manifest_cid, status, logical_path, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          record.id,
          record.fileId,
          record.ownerWallet,
          record.filename,
          record.size,
          record.mimeType,
          record.chunkSize,
          record.totalChunks,
          record.encryptionAlgorithm,
          record.integrityAlgorithm,
          record.manifestCID || null,
          record.status,
          record.logicalPath,
          record.createdAt,
          record.updatedAt,
        ]
      );
      return record;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  snap.files[record.fileId] = record;
  writeSnapshot(snap);
  return record;
}

export async function getFileRecord(fileId: string): Promise<DBFile | null> {
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        "SELECT * FROM files WHERE file_id = $1 OR id = $1 LIMIT 1",
        [fileId]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          fileId: r.file_id,
          ownerWallet: r.owner_wallet,
          filename: r.filename,
          size: Number(r.size),
          mimeType: r.mime_type,
          chunkSize: Number(r.chunk_size),
          totalChunks: Number(r.total_chunks),
          encryptionAlgorithm: r.encryption_algorithm,
          integrityAlgorithm: r.integrity_algorithm,
          manifestCID: r.manifest_cid,
          status: r.status,
          logicalPath: r.logical_path,
          createdAt: r.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
        };
      }
      return null;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  return snap.files[fileId] || null;
}

export async function listFilesByOwner(ownerWallet: string): Promise<DBFile[]> {
  const normalized = ownerWallet.toLowerCase();
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        "SELECT * FROM files WHERE LOWER(owner_wallet) = $1 AND status != 'deleted' ORDER BY created_at DESC",
        [normalized]
      );
      return res.rows.map((r) => ({
        id: r.id,
        fileId: r.file_id,
        ownerWallet: r.owner_wallet,
        filename: r.filename,
        size: Number(r.size),
        mimeType: r.mime_type,
        chunkSize: Number(r.chunk_size),
        totalChunks: Number(r.total_chunks),
        encryptionAlgorithm: r.encryption_algorithm,
        integrityAlgorithm: r.integrity_algorithm,
        manifestCID: r.manifest_cid,
        status: r.status,
        logicalPath: r.logical_path,
        createdAt: r.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
      }));
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  return Object.values(snap.files)
    .filter((f) => f.ownerWallet.toLowerCase() === normalized && f.status !== "deleted")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateFileRecord(
  fileId: string,
  updates: Partial<DBFile>
): Promise<DBFile | null> {
  const now = new Date().toISOString();
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const file = await getFileRecord(fileId);
      if (!file) return null;

      const merged = { ...file, ...updates, updatedAt: now };
      await pgPool.query(
        `UPDATE files SET
           filename = $1,
           status = $2,
           manifest_cid = $3,
           updated_at = $4
         WHERE file_id = $5`,
        [merged.filename, merged.status, merged.manifestCID || null, now, fileId]
      );
      return merged;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  const file = snap.files[fileId];
  if (!file) return null;

  const updated: DBFile = { ...file, ...updates, updatedAt: now };
  snap.files[fileId] = updated;
  writeSnapshot(snap);
  return updated;
}

export async function deleteFileRecord(fileId: string): Promise<boolean> {
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        "UPDATE files SET status = 'deleted', updated_at = NOW() WHERE file_id = $1",
        [fileId]
      );
      await pgPool.query(
        "UPDATE shares SET status = 'revoked' WHERE file_id = $1",
        [fileId]
      );
      return true;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  if (snap.files[fileId]) {
    snap.files[fileId].status = "deleted";
    snap.files[fileId].updatedAt = new Date().toISOString();
    // Invalidate shares
    for (const share of Object.values(snap.shares)) {
      if (share.fileId === fileId) {
        share.status = "revoked";
      }
    }
    writeSnapshot(snap);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Repository
// ─────────────────────────────────────────────────────────────────────────────

export async function recordChunkData(data: {
  fileId: string;
  chunkIndex: number;
  ipfsCID: string;
  sha256: string;
  iv: string;
  encryptedSize: number;
  status?: "pending" | "uploaded" | "verified" | "failed";
}): Promise<DBChunk> {
  const now = new Date().toISOString();
  const id = `chk_${data.fileId}_${data.chunkIndex}`;
  const chunk: DBChunk = {
    id,
    fileId: data.fileId,
    chunkIndex: data.chunkIndex,
    ipfsCID: data.ipfsCID,
    sha256: data.sha256,
    iv: data.iv,
    encryptedSize: data.encryptedSize,
    status: data.status || "uploaded",
    createdAt: now,
  };

  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO file_chunks (id, file_id, chunk_index, ipfs_cid, sha256, iv, encrypted_size, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (file_id, chunk_index) DO UPDATE SET
           ipfs_cid = EXCLUDED.ipfs_cid,
           sha256 = EXCLUDED.sha256,
           iv = EXCLUDED.iv,
           encrypted_size = EXCLUDED.encrypted_size,
           status = EXCLUDED.status`,
        [
          chunk.id,
          chunk.fileId,
          chunk.chunkIndex,
          chunk.ipfsCID,
          chunk.sha256,
          chunk.iv,
          chunk.encryptedSize,
          chunk.status,
          chunk.createdAt,
        ]
      );
      return chunk;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  snap.chunks[id] = chunk;
  writeSnapshot(snap);
  return chunk;
}

export async function getChunksForFile(fileId: string): Promise<DBChunk[]> {
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        "SELECT * FROM file_chunks WHERE file_id = $1 ORDER BY chunk_index ASC",
        [fileId]
      );
      return res.rows.map((r) => ({
        id: r.id,
        fileId: r.file_id,
        chunkIndex: Number(r.chunk_index),
        ipfsCID: r.ipfs_cid,
        sha256: r.sha256,
        iv: r.iv,
        encryptedSize: Number(r.encrypted_size),
        status: r.status,
        createdAt: r.created_at?.toISOString() || new Date().toISOString(),
      }));
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  return Object.values(snap.chunks)
    .filter((c) => c.fileId === fileId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
}

// ─────────────────────────────────────────────────────────────────────────────
// Share Repository
// ─────────────────────────────────────────────────────────────────────────────

export async function createShareRecord(data: {
  shareId: string;
  fileId: string;
  ownerWallet: string;
  recipient: string;
  recipientPublicKeyFingerprint?: string;
  encryptedFileKey: string;
  keyAgreementMetadata?: Record<string, unknown>;
  expiresAt?: string;
  maxDownloads?: number;
  oneTime?: boolean;
}): Promise<DBShare> {
  const now = new Date().toISOString();
  const id = `shr_${data.shareId}`;
  const share: DBShare = {
    id,
    shareId: data.shareId,
    fileId: data.fileId,
    ownerWallet: data.ownerWallet.toLowerCase(),
    recipient: data.recipient.toLowerCase(),
    recipientPublicKeyFingerprint: data.recipientPublicKeyFingerprint,
    encryptedFileKey: data.encryptedFileKey,
    keyAgreementMetadata: data.keyAgreementMetadata,
    expiresAt: data.expiresAt,
    maxDownloads: data.maxDownloads ?? 1,
    downloadCount: 0,
    oneTime: Boolean(data.oneTime),
    status: "active",
    createdAt: now,
  };

  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO shares (id, share_id, file_id, owner_wallet, recipient, recipient_public_key_fingerprint, encrypted_file_key, key_agreement_metadata, expires_at, max_downloads, download_count, one_time, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          share.id,
          share.shareId,
          share.fileId,
          share.ownerWallet,
          share.recipient,
          share.recipientPublicKeyFingerprint || null,
          share.encryptedFileKey,
          JSON.stringify(share.keyAgreementMetadata || {}),
          share.expiresAt || null,
          share.maxDownloads,
          share.downloadCount,
          share.oneTime,
          share.status,
          share.createdAt,
        ]
      );
      return share;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  snap.shares[share.shareId] = share;
  writeSnapshot(snap);
  return share;
}

export async function getShareRecord(shareId: string): Promise<DBShare | null> {
  await initDatabase();
  const normalized = shareId.trim();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        "SELECT * FROM shares WHERE share_id = $1 OR id = $1 LIMIT 1",
        [normalized]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          shareId: r.share_id,
          fileId: r.file_id,
          ownerWallet: r.owner_wallet,
          recipient: r.recipient,
          recipientPublicKeyFingerprint: r.recipient_public_key_fingerprint,
          encryptedFileKey: r.encrypted_file_key,
          keyAgreementMetadata: r.key_agreement_metadata,
          expiresAt: r.expires_at?.toISOString(),
          maxDownloads: Number(r.max_downloads),
          downloadCount: Number(r.download_count),
          oneTime: Boolean(r.one_time),
          status: r.status,
          createdAt: r.created_at?.toISOString() || new Date().toISOString(),
          lastAccessedAt: r.last_accessed_at?.toISOString(),
        };
      }
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  let found: DBShare | null = snap.shares[normalized] || null;
  if (!found) {
    found =
      (Object.values(snap.shares).find(
        (s) =>
          s.shareId === normalized ||
          s.id === normalized ||
          (s as any).shareCode === normalized
      ) as DBShare) || null;
  }

  // Also check .payload-store.json for cross-store synchronization
  if (!found) {
    try {
      const storePath = path.join(process.cwd(), ".payload-store.json");
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, "utf-8");
        if (raw.trim()) {
          const storeData = JSON.parse(raw);
          const storeShare =
            storeData.shares?.[normalized] ||
            Object.values(storeData.shares || {}).find(
              (s: any) =>
                s.shareId === normalized ||
                s.id === normalized ||
                s.shareCode === normalized
            );
          if (storeShare) {
            found = {
              id: storeShare.id || storeShare.shareId,
              shareId: storeShare.shareId || storeShare.id,
              fileId: storeShare.fileId,
              ownerWallet: storeShare.ownerWallet,
              recipient: storeShare.recipientUserId || "public",
              recipientPublicKeyFingerprint: storeShare.recipientPublicKeyFingerprint,
              encryptedFileKey: storeShare.encryptedFileKey,
              keyAgreementMetadata: storeShare.keyAgreementMetadata,
              expiresAt: storeShare.expiresAt || undefined,
              maxDownloads: storeShare.maxDownloads ?? 1,
              downloadCount: storeShare.downloadCount || 0,
              oneTime: Boolean(storeShare.oneTime),
              status: storeShare.status || "active",
              createdAt: storeShare.createdAt || new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return found || null;
}

export async function updateShareRecord(
  shareId: string,
  updates: Partial<DBShare>
): Promise<DBShare | null> {
  await initDatabase();
  const normalized = shareId.trim();

  if (pgConnected && pgPool) {
    try {
      const share = await getShareRecord(normalized);
      if (share) {
        const merged = { ...share, ...updates };
        await pgPool.query(
          `UPDATE shares SET
             status = $1,
             download_count = $2,
             last_accessed_at = $3
           WHERE share_id = $4 OR id = $4`,
          [
            merged.status,
            merged.downloadCount,
            merged.lastAccessedAt ? new Date(merged.lastAccessedAt) : new Date(),
            normalized,
          ]
        );
      }
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  let foundKey = Object.keys(snap.shares).find(
    (k) =>
      k === normalized ||
      snap.shares[k].shareId === normalized ||
      snap.shares[k].id === normalized
  );

  let updated: DBShare | null = null;
  if (foundKey) {
    updated = { ...snap.shares[foundKey], ...updates };
    snap.shares[foundKey] = updated;
    writeSnapshot(snap);
  }

  // Also sync updates to .payload-store.json if present
  try {
    const storePath = path.join(process.cwd(), ".payload-store.json");
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, "utf-8");
      if (raw.trim()) {
        const storeData = JSON.parse(raw);
        for (const k of Object.keys(storeData.shares || {})) {
          const s = storeData.shares[k];
          if (
            k === normalized ||
            s.shareId === normalized ||
            s.id === normalized ||
            s.shareCode === normalized
          ) {
            Object.assign(s, updates);
            if (!updated) {
              updated = {
                id: s.id,
                shareId: s.shareId,
                fileId: s.fileId,
                ownerWallet: s.ownerWallet,
                recipient: s.recipientUserId || "public",
                recipientPublicKeyFingerprint: s.recipientPublicKeyFingerprint,
                encryptedFileKey: s.encryptedFileKey,
                keyAgreementMetadata: s.keyAgreementMetadata,
                expiresAt: s.expiresAt,
                maxDownloads: s.maxDownloads,
                downloadCount: s.downloadCount,
                oneTime: s.oneTime,
                status: s.status,
                createdAt: s.createdAt,
              };
            }
          }
        }
        fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2), "utf-8");
      }
    }
  } catch {
    // ignore
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Audit Logger
// ─────────────────────────────────────────────────────────────────────────────

export async function recordActivityLog(data: {
  userWallet: string;
  action: string;
  fileId?: string;
  shareId?: string;
  metadata?: Record<string, unknown>;
}): Promise<DBActivity> {
  const now = new Date().toISOString();
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const activity: DBActivity = {
    id,
    userWallet: data.userWallet.toLowerCase(),
    action: data.action,
    fileId: data.fileId,
    shareId: data.shareId,
    metadata: data.metadata,
    timestamp: now,
  };

  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO activity (id, user_wallet, action, file_id, share_id, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          activity.id,
          activity.userWallet,
          activity.action,
          activity.fileId || null,
          activity.shareId || null,
          JSON.stringify(activity.metadata || {}),
          activity.timestamp,
        ]
      );
      return activity;
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  snap.activity.unshift(activity);
  if (snap.activity.length > 500) snap.activity = snap.activity.slice(0, 500);
  writeSnapshot(snap);
  return activity;
}

export async function listActivityLogs(userWallet?: string, limit = 50): Promise<DBActivity[]> {
  await initDatabase();

  if (pgConnected && pgPool) {
    try {
      let res;
      if (userWallet) {
        res = await pgPool.query(
          "SELECT * FROM activity WHERE LOWER(user_wallet) = $1 ORDER BY timestamp DESC LIMIT $2",
          [userWallet.toLowerCase(), limit]
        );
      } else {
        res = await pgPool.query(
          "SELECT * FROM activity ORDER BY timestamp DESC LIMIT $1",
          [limit]
        );
      }
      return res.rows.map((r) => ({
        id: r.id,
        userWallet: r.user_wallet,
        action: r.action,
        fileId: r.file_id,
        shareId: r.share_id,
        metadata: r.metadata,
        timestamp: r.timestamp?.toISOString() || new Date().toISOString(),
      }));
    } catch {
      // fallback
    }
  }

  const snap = readSnapshot();
  let list = snap.activity;
  if (userWallet) {
    const norm = userWallet.toLowerCase();
    list = list.filter((a) => a.userWallet === norm);
  }
  return list.slice(0, limit);
}
