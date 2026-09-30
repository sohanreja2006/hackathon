import { PayloadFile, PayloadChunk, PayloadManifest, FileUploadStatus } from "@/payload/types";

/**
 * Payload CMS Client Library for SecureVault Frontend
 */

function getAuthHeaders(vaultXId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (vaultXId) {
    headers["x-vaultx-id"] = vaultXId;
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
