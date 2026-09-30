import { PayloadFile, PayloadChunk, PayloadManifest, FileUploadStatus } from "@/payload/types";

/**
 * Payload CMS Client Library for SecureVault Frontend
 */

function getAuthHeaders(walletOrVxId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (walletOrVxId) {
    if (walletOrVxId.startsWith("VX-")) {
      headers["x-vaultx-id"] = walletOrVxId;
    } else {
      headers["x-wallet-address"] = walletOrVxId;
    }
  }
  return headers;
}

export async function fetchPayloadFiles(vaultXId?: string | null): Promise<PayloadFile[]> {
  try {
    const res = await fetch("/api/payload/files", {
      method: "GET",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.docs) ? data.docs : [];
  } catch (err) {
    console.error("fetchPayloadFiles error:", err);
    return [];
  }
}

export async function fetchPayloadFileDetails(
  fileId: string,
  vaultXId?: string | null
): Promise<{ file: PayloadFile; chunks: PayloadChunk[] } | null> {
  try {
    const res = await fetch(`/api/payload/files/${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.doc) {
      return { file: data.doc, chunks: data.chunks || [] };
    }
    return null;
  } catch (err) {
    console.error("fetchPayloadFileDetails error:", err);
    return null;
  }
}

export async function createPayloadFileRecord(
  params: {
    originalName: string;
    size: number;
    mimeType: string;
    totalChunks: number;
    chunkSize: number;
  },
  vaultXId?: string | null
): Promise<PayloadFile | null> {
  try {
    const res = await fetch("/api/payload/files", {
      method: "POST",
      headers: getAuthHeaders(vaultXId),
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.doc : null;
  } catch (err) {
    console.error("createPayloadFileRecord error:", err);
    return null;
  }
}

export async function updatePayloadFileStatus(
  fileId: string,
  updates: {
    uploadStatus?: FileUploadStatus;
    manifestCID?: string;
    integrityStatus?: "pending" | "verified" | "failed";
  },
  vaultXId?: string | null
): Promise<PayloadFile | null> {
  try {
    const res = await fetch(`/api/payload/files/${encodeURIComponent(fileId)}`, {
      method: "PATCH",
      headers: getAuthHeaders(vaultXId),
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.doc : null;
  } catch (err) {
    console.error("updatePayloadFileStatus error:", err);
    return null;
  }
}

export async function recordPayloadChunk(
  params: {
    fileId: string;
    chunkIndex: number;
    chunkSize: number;
    encryptedSize: number;
    iv: string;
    hash: string;
    cid: string;
    status?: "uploaded" | "verified";
  },
  vaultXId?: string | null
): Promise<PayloadChunk | null> {
  try {
    const res = await fetch("/api/payload/chunks", {
      method: "POST",
      headers: getAuthHeaders(vaultXId),
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.doc : null;
  } catch (err) {
    console.error("recordPayloadChunk error:", err);
    return null;
  }
}

export async function fetchUploadedChunkIndices(
  fileId: string,
  vaultXId?: string | null
): Promise<number[]> {
  try {
    const res = await fetch(`/api/payload/chunks?fileId=${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.uploadedIndices) ? data.uploadedIndices : [];
  } catch (err) {
    console.error("fetchUploadedChunkIndices error:", err);
    return [];
  }
}

export async function savePayloadManifestRecord(
  params: {
    fileId: string;
    manifestCID: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    chunkSize: number;
    totalChunks: number;
    chunks: Array<{ index: number; cid: string; hash: string; iv?: string; size?: number }>;
  },
  vaultXId?: string | null
): Promise<PayloadManifest | null> {
  try {
    const res = await fetch("/api/payload/manifests", {
      method: "POST",
      headers: getAuthHeaders(vaultXId),
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.manifest : null;
  } catch (err) {
    console.error("savePayloadManifestRecord error:", err);
    return null;
  }
}

export async function fetchPayloadManifest(
  fileId: string,
  vaultXId?: string | null
): Promise<PayloadManifest | null> {
  try {
    const res = await fetch(`/api/payload/manifests?fileId=${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.manifest : null;
  } catch (err) {
    console.error("fetchPayloadManifest error:", err);
    return null;
  }
}

export async function deletePayloadFile(
  fileId: string,
  vaultXId?: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`/api/payload/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("deletePayloadFile error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURE SHARE CLIENT API
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateSecureShareParams {
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  manifestCID?: string;
  cid?: string;
  expirationOption?: "never" | "1h" | "24h" | "7d" | "30d";
  passwordProtected?: boolean;
  password?: string;
}

export async function createSecureShare(
  params: CreateSecureShareParams,
  vaultXId?: string | null
) {
  try {
    const res = await fetch("/api/payload/shares", {
      method: "POST",
      headers: getAuthHeaders(vaultXId),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to create secure share.");
    }
    return data.share;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create secure share.";
    throw new Error(msg);
  }
}

export async function fetchFileShares(
  fileId: string,
  vaultXId?: string | null
) {
  try {
    const res = await fetch(`/api/payload/shares?fileId=${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.shares) ? data.shares : [];
  } catch (err) {
    console.error("fetchFileShares error:", err);
    return [];
  }
}

export async function lookupSecureShare(shareCode: string) {
  try {
    const res = await fetch(`/api/payload/shares/lookup?code=${encodeURIComponent(shareCode)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lookup failed.";
    return { success: false, error: msg, status: "error" };
  }
}

export async function accessSecureShare(shareCode: string, password?: string) {
  try {
    const res = await fetch("/api/payload/shares/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: shareCode, password }),
    });
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Access failed.";
    return { success: false, error: msg };
  }
}

export async function revokeSecureShare(
  shareId: string,
  vaultXId?: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`/api/payload/shares/${encodeURIComponent(shareId)}/revoke`, {
      method: "PATCH",
      headers: getAuthHeaders(vaultXId),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("revokeSecureShare error:", err);
    return false;
  }
}

