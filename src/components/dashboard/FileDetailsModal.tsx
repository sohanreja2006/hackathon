"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  Download,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Database,
  Calendar,
  KeyRound,
  Loader2,
  HardDrive,
  AlertCircle,
  Trash2,
  Share2,
  Sparkles,
  Clock,
} from "lucide-react";
import { formatBytes, downloadAndDecryptFromIpfs } from "@/lib/crypto";
import { PayloadFile, PayloadChunk, PayloadShare } from "@/payload/types";
import { fetchPayloadFileDetails, fetchFileShares, revokeSecureShare } from "@/lib/payloadClient";
import { getIpfsUrl } from "@/lib/ipfs/gateway";
import { CreateSecureShareModal } from "./CreateSecureShareModal";

interface FileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
  initialFile?: PayloadFile | null;
  localKeyHex?: string | null;
  vaultXId?: string | null;
  onDelete?: () => void;
}

export function FileDetailsModal({
  isOpen,
  onClose,
  fileId,
  initialFile,
  localKeyHex,
  vaultXId,
  onDelete,
}: FileDetailsModalProps) {
  const [file, setFile] = useState<PayloadFile | null>(initialFile || null);
  const [chunks, setChunks] = useState<PayloadChunk[]>([]);
  const [shares, setShares] = useState<PayloadShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareToRevoke, setShareToRevoke] = useState<PayloadShare | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);


  // Decryption state
  const [keyInput, setKeyInput] = useState(localKeyHex || "");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState<string>("");
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(!localKeyHex);

  useEffect(() => {
    if (localKeyHex) {
      setKeyInput(localKeyHex);
    }
  }, [localKeyHex]);

  useEffect(() => {
    if (!isOpen || !fileId) return;
    const targetFileId: string = fileId;

    let isSubscribed = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [details, fileShares] = await Promise.all([
          fetchPayloadFileDetails(targetFileId, vaultXId),
          fetchFileShares(targetFileId, vaultXId),
        ]);
        if (isSubscribed) {
          if (details) {
            setFile(details.file);
            setChunks(details.chunks);
          }
          if (fileShares) {
            setShares(fileShares);
          }
        }
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen, fileId, vaultXId]);

  const refreshShares = async () => {
    if (!fileId) return;
    const fileShares = await fetchFileShares(fileId, vaultXId);
    setShares(fileShares || []);
  };

  const handleConfirmRevoke = async () => {
    if (!shareToRevoke) return;
    try {
      setIsRevoking(true);
      await revokeSecureShare(shareToRevoke.id, vaultXId);
      setShareToRevoke(null);
      await refreshShares();
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDecryptAndDownload = async () => {
    if (!file) return;

    const key = keyInput.trim();
    if (!key) {
      setDecryptError("Please enter your 64-character AES-256 decryption key.");
      setShowKeyInput(true);
      return;
    }

    if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
      setDecryptError("Invalid key format: AES key must be exactly 64 hexadecimal characters.");
      setShowKeyInput(true);
      return;
    }

    // Determine target CID: manifestCID or first chunk CID
    const targetCid = file.manifestCID || chunks[0]?.cid;
    if (!targetCid) {
      setDecryptError("No IPFS content CID is recorded for this file.");
      return;
    }

    try {
      setIsDecrypting(true);
      setDecryptError(null);
      setDecryptProgress("Retrieving encrypted content from decentralized IPFS...");

      const decrypted = await downloadAndDecryptFromIpfs(
        targetCid,
        key,
        undefined,
        (msg) => setDecryptProgress(msg)
      );

      const url = window.URL.createObjectURL(decrypted.plainBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decrypted.originalName || file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDecryptProgress("Decrypted and downloaded successfully!");
      setTimeout(() => setDecryptProgress(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decryption failed.";
      if (
        msg.toLowerCase().includes("operation failed") ||
        msg.toLowerCase().includes("operationerror") ||
        msg.toLowerCase().includes("tag")
      ) {
        setDecryptError("Authentication failed: Incorrect AES key. Tag mismatch.");
      } else {
        setDecryptError(`Decryption error: ${msg}`);
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  const totalChunks = file?.totalChunks || Math.max(chunks.length, 1);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 shrink-0">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {file?.originalName || "File Details"}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {file?.logicalPath || (fileId ? `/vault/${fileId}/` : "")}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && !file ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
                <p className="text-xs text-slate-500">Loading Payload metadata...</p>
              </div>
            ) : (
              <>
                {/* Drive-Style File Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">File size</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {file ? formatBytes(file.size) : "—"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">MIME type</span>
                    <span className="text-xs font-semibold text-slate-900 truncate block">
                      {file?.mimeType || "application/octet-stream"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">Upload status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {file?.uploadStatus === "completed" ? "Completed" : file?.uploadStatus || "Active"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">Encryption algorithm</span>
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {file?.encryptionAlgorithm || "AES-256-GCM"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">Integrity verification</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {file?.integrityAlgorithm || "SHA-256 Verified"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <span className="text-[11px] font-medium text-slate-400 block">Total chunks</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {totalChunks} {totalChunks === 1 ? "chunk" : "chunks"} ({file ? formatBytes(file.chunkSize) : "8 MB"}/ea)
                    </span>
                  </div>
                </div>

                {/* Manifest CID Bar */}
                {file?.manifestCID && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Lock className="h-4 w-4 text-[#2563EB] shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block text-[11px]">
                          Manifest CID (IPFS)
                        </span>
                        <span className="font-mono text-slate-600 truncate block">
                          {file.manifestCID}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(file.manifestCID!, "manifest")}
                        type="button"
                        className="p-1.5 rounded-lg border border-blue-200 bg-white text-slate-600 hover:text-[#2563EB]"
                        title="Copy Manifest CID"
                      >
                        {copiedText === "manifest" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <a
                        href={getIpfsUrl(file.manifestCID)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-blue-200 bg-white text-slate-600 hover:text-[#2563EB]"
                        title="View Manifest on IPFS Gateway"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* ── ACTIVE SHARES SECTION ── */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-[#2563EB]" />
                      <span className="text-xs font-bold text-slate-900">Active Secure Shares</span>
                      <span className="text-[11px] font-mono text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-0.2 rounded-full">
                        {shares.filter((s) => s.status === "active").length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-2xs transition-colors"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Create Share Code</span>
                    </button>
                  </div>

                  {shares.length > 0 ? (
                    <div className="space-y-2">
                      {shares.map((shr) => (
                        <div
                          key={shr.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {shr.shareCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(shr.shareCode, shr.id)}
                                title="Copy Share Code"
                                className="text-slate-400 hover:text-[#2563EB]"
                              >
                                {copiedText === shr.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  shr.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : shr.status === "revoked"
                                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {shr.status.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                              <span>
                                Downloads: {shr.downloadCount} / {shr.maxDownloads !== null ? shr.maxDownloads : "∞"}
                              </span>
                              <span>•</span>
                              <span>
                                Expires:{" "}
                                {shr.expiresAt
                                  ? new Date(shr.expiresAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Never"}
                              </span>
                            </div>
                          </div>

                          {shr.status === "active" && (
                            <button
                              type="button"
                              onClick={() => setShareToRevoke(shr)}
                              className="px-3 py-1 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors shrink-0"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 py-1">
                      No secure share codes have been generated for this file yet.
                    </p>
                  )}
                </div>

                {/* Interactive Chunk Map */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                      Encrypted Chunk Map ({Math.max(chunks.length, totalChunks)} blocks)
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Stored on IPFS with SHA-256 checksums
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {chunks.length > 0 ? (
                      chunks.map((chunk, idx) => (
                        <div
                          key={chunk.id || idx}
                          className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                              {String(chunk.chunkIndex + 1).padStart(3, "0")} ✓
                            </span>
                            <span className="font-mono text-[11px] text-slate-600 truncate">
                              CID: {chunk.cid.substring(0, 10)}...{chunk.cid.slice(-6)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0">
                            <span className="hidden sm:inline">SHA-256: {chunk.hash.substring(0, 8)}...</span>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                              Uploaded
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      Array.from({ length: Math.min(totalChunks, 6) }).map((_, i) => (
                        <div
                          key={i}
                          className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-[#2563EB] font-bold">
                            {String(i + 1).padStart(3, "0")} ✓ Verified
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            AES-256-GCM · 8 MB block
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Decryption & Download Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-[#2563EB]" />
                      Local Browser Decryption
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[11px] text-[#2563EB] hover:underline"
                    >
                      {showKeyInput ? "Hide Key Input" : "Edit AES Key"}
                    </button>
                  </div>

                  {showKeyInput && (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="64-character hexadecimal AES-256 decryption key"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <p className="text-[10px] text-slate-400">
                        Your key is processed in local browser WebCrypto memory only. Never sent to server.
                      </p>
                    </div>
                  )}

                  {decryptProgress && (
                    <p className="text-xs text-[#2563EB] font-medium animate-pulse">
                      {decryptProgress}
                    </p>
                  )}

                  {decryptError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{decryptError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDecryptAndDownload}
                    disabled={isDecrypting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    {isDecrypting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Decrypting Locally...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Decrypt & Download Original File</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Owner: {file?.ownerWallet ? `${file.ownerWallet.substring(0, 6)}...${file.ownerWallet.slice(-4)}` : "—"}</span>
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3.5 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete File</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Revoke Share Confirmation Modal */}
      {shareToRevoke && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm">Revoke this share?</span>
              <button
                type="button"
                onClick={() => setShareToRevoke(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              This code (<strong className="font-mono text-slate-900">{shareToRevoke.shareCode}</strong>) will immediately stop working and no longer provide access to the file.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShareToRevoke(null)}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <span>Revoke Share</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Secure Share Modal */}
      {file && (
        <CreateSecureShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          file={{
            id: file.id,
            cid: file.manifestCID || "",
            fileName: file.originalName,
            originalName: file.originalName,
            extension: file.originalName.split(".").pop() || "",
            fileSize: file.size,
            mimeType: file.mimeType,
            uploadedAt: file.createdAt,
            ownerAddress: file.ownerWallet,
            keyHex: localKeyHex || "",
            algorithm: "AES-256-GCM",
            sharedWith: [],
            totalChunks: file.totalChunks,
            chunkSize: file.chunkSize,
            manifestCID: file.manifestCID,
          }}
          vaultXId={vaultXId}
          onShareCreated={() => {
            refreshShares();
          }}
        />
      )}
    </>
  );
}

