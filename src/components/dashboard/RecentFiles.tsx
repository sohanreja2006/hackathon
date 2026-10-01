"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Lock, 
  ShieldCheck, 
  Download, 
  Share2, 
  Search, 
  Check, 
  Copy, 
  Info, 
  Loader2, 
  ExternalLink, 
  Users, 
  KeyRound, 
  FileText, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Plus,
  Trash2,
  FileDown,
  Activity,
  Clock,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatBytes, downloadAndDecryptFromIpfs, reencryptKeyForRecipient, decryptKeyForRecipient } from "@/lib/crypto";
import { getAllVaultFiles, getSharedWithMeFiles, recordFileShare, deleteVaultFile, StoredEncryptedFile, SharedFileRecord } from "@/lib/fileStorage";
import { useAccount, useSignMessage } from "wagmi";
import { isAddress } from "viem";
import { getIpfsUrl } from "@/lib/ipfs/gateway";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { OwlCompanion } from "@/components/ui/OwlCompanion";
import { fetchPayloadFiles, deletePayloadFile } from "@/lib/payloadClient";
import { FileDetailsModal } from "./FileDetailsModal";
import { CreateSecureShareModal } from "./CreateSecureShareModal";
import { ReceiveSecureFileModal } from "./ReceiveSecureFileModal";
import { SecureFilePreviewModal, SecurePreviewData } from "./SecureFilePreviewModal";
import { PayloadActivityLog } from "@/payload/types";


export function RecentFiles() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { identity: vaultXIdentity, isConnected: isVaultXConnected } = useVaultXWallet();

  // Resolved owner key: Local VaultX wallet takes precedence when connected
  const ownerKey = (isVaultXConnected && vaultXIdentity?.id)
    ? vaultXIdentity.id
    : (address?.toLowerCase() ?? null);

  const [activeTab, setActiveTab] = useState<"my_files" | "shared_with_me" | "activity">("my_files");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Directory state
  const [myFiles, setMyFiles] = useState<StoredEncryptedFile[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFileRecord[]>([]);

  // Activity audit log state
  const [activityLogs, setActivityLogs] = useState<PayloadActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Decryption state (FR-5)
  const [decryptingCid, setDecryptingCid] = useState<string | null>(null);
  const [decryptProgress, setDecryptProgress] = useState<string>("");
  const [readyDownload, setReadyDownload] = useState<{ name: string; url: string; blob?: Blob; mimeType?: string } | null>(null);
  const [previewModalData, setPreviewModalData] = useState<SecurePreviewData | null>(null);

  // Decrypt Key Prompt Modal State
  const [decryptModalFile, setDecryptModalFile] = useState<StoredEncryptedFile | null>(null);
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [decryptModalError, setDecryptModalError] = useState<string | null>(null);
  const [isDecryptingModal, setIsDecryptingModal] = useState(false);

  // Share modal state (FR-6)
  const [sharingFile, setSharingFile] = useState<StoredEncryptedFile | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // File Details Modal State (Drive-style file details & chunk map)
  const [detailsModalFile, setDetailsModalFile] = useState<StoredEncryptedFile | null>(null);

  // Secure Share Code State
  const [secureShareFile, setSecureShareFile] = useState<StoredEncryptedFile | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Delete Confirmation Modal State
  const [fileToDelete, setFileToDelete] = useState<StoredEncryptedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);
      if (fileToDelete.id) {
        await deletePayloadFile(fileToDelete.id, vaultXIdentity?.id);
      }
      deleteVaultFile(fileToDelete.id);
      if (fileToDelete.cid) {
        deleteVaultFile(fileToDelete.cid);
      }
      setActiveNotification(`File "${fileToDelete.fileName}" removed from vault.`);
      setFileToDelete(null);
      await refreshFiles();
    } catch (err) {
      console.error("Delete failed:", err);
      setActiveNotification("Failed to delete file.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Load all user files from registry & Payload CMS backend
  const refreshFiles = useCallback(async () => {
    const localFiles = getAllVaultFiles([address, vaultXIdentity?.id]);

    let payloadDocs: StoredEncryptedFile[] = [];
    try {
      const payloadFiles = await fetchPayloadFiles(vaultXIdentity?.id);
      payloadDocs = payloadFiles.map((pf) => {
        const matchingLocal = localFiles.find(
          (lf) => lf.cid === pf.manifestCID || lf.fileName === pf.originalName
        );
        return {
          id: pf.id,
          cid: pf.manifestCID || matchingLocal?.cid || "",
          fileName: pf.originalName,
          originalName: pf.originalName,
          extension: pf.originalName.split(".").pop()?.toUpperCase() || "BIN",
          fileSize: pf.size,
          mimeType: pf.mimeType,
          uploadedAt: pf.createdAt,
          ownerAddress: pf.ownerWallet,
          keyHex: matchingLocal?.keyHex || "",
          wrappedKey: matchingLocal?.wrappedKey,
          algorithm: pf.encryptionAlgorithm,
          sharedWith: matchingLocal?.sharedWith || [],
          totalChunks: pf.totalChunks,
          chunkSize: pf.chunkSize,
          manifestCID: pf.manifestCID,
          logicalPath: pf.logicalPath,
          uploadStatus: pf.uploadStatus,
          integrityStatus: pf.integrityStatus,
        };
      });
    } catch (err) {
      console.warn("Could not query Payload files:", err);
    }

    // Merge: Payload entries are primary, complemented by local-only entries
    const fileMap = new Map<string, StoredEncryptedFile>();
    for (const pf of payloadDocs) {
      if (pf.id) fileMap.set(pf.id, pf);
    }
    for (const lf of localFiles) {
      const exists = Array.from(fileMap.values()).some(
        (f) => (f.cid && f.cid === lf.cid) || f.fileName === lf.fileName
      );
      if (!exists) {
        fileMap.set(lf.id, lf);
      }
    }

    setMyFiles(Array.from(fileMap.values()));
    setSharedFiles(address ? getSharedWithMeFiles(address) : []);
  }, [address, vaultXIdentity]);

  // Fetch real cryptographic audit log
  const fetchActivityLogs = useCallback(async () => {
    setIsLoadingActivity(true);
    try {
      const activeAddress = address || vaultXIdentity?.id;
      const res = await fetch("/api/payload/activity?limit=50", {
        headers: activeAddress ? { "x-wallet-address": activeAddress } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.activity)) {
        setActivityLogs(data.activity);
      }
    } catch (err) {
      console.warn("Could not query activity logs:", err);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [address, vaultXIdentity]);

  useEffect(() => {
    refreshFiles();
    fetchActivityLogs();
    const handleFocus = () => {
      refreshFiles();
      fetchActivityLogs();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
    };
  }, [refreshFiles, fetchActivityLogs]);

  const handleCopy = (text: string, type: "cid" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "cid") {
      setCopiedCid(text);
      setTimeout(() => setCopiedCid(null), 2000);
    } else {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FR-5: Decrypt with Key Verification
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenDecryptModal = (file: StoredEncryptedFile) => {
    setDecryptModalFile(file);
    setManualKeyInput("");
    setShowKeyInput(false);
    setDecryptModalError(null);
  };

  const handleCloseDecryptModal = () => {
    if (isDecryptingModal) return;
    setDecryptModalFile(null);
    setManualKeyInput("");
    setShowKeyInput(false);
    setDecryptModalError(null);
  };

  const handleConfirmDecryptWithKey = async () => {
    if (!decryptModalFile) return;

    const key = manualKeyInput.trim();
    if (!key) {
      setDecryptModalError("Please enter the 64-character AES-256 decryption key.");
      return;
    }

    if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
      setDecryptModalError("Invalid key format: AES key must be exactly 64 hexadecimal characters.");
      return;
    }

    try {
      setIsDecryptingModal(true);
      setDecryptModalError(null);
      setDecryptingCid(decryptModalFile.cid);
      setDecryptProgress("Fetching ciphertext from IPFS gateway...");

      const decrypted = await downloadAndDecryptFromIpfs(
        decryptModalFile.cid,
        key,
        undefined,
        (msg) => setDecryptProgress(msg)
      );

      const url = window.URL.createObjectURL(decrypted.plainBlob);
      setReadyDownload({
        name: decrypted.originalName,
        url,
        blob: decrypted.plainBlob,
        mimeType: decrypted.mimeType,
      });
      setActiveNotification(`Decrypted: ${decrypted.originalName}`);

      // Auto-trigger direct browser file download
      const a = document.createElement("a");
      a.href = url;
      a.download = decrypted.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Close modal
      setDecryptModalFile(null);
      setManualKeyInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decryption failed.";
      if (
        msg.toLowerCase().includes("operation failed") ||
        msg.toLowerCase().includes("operationerror") ||
        msg.toLowerCase().includes("tag") ||
        msg.toLowerCase().includes("mac") ||
        msg.toLowerCase().includes("decrypt")
      ) {
        setDecryptModalError("Decryption failed: Incorrect key. The AES-256-GCM authentication tag did not match.");
      } else {
        setDecryptModalError(`Decryption error: ${msg}`);
      }
    } finally {
      setIsDecryptingModal(false);
      setDecryptingCid(null);
      setDecryptProgress("");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FR-5: 1-Click Decrypt for Shared With Me Files
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSharedDecrypt = async (share: SharedFileRecord) => {
    if (!address) {
      setActiveNotification("Please connect your Web3 wallet first.");
      return;
    }

    try {
      setDecryptingCid(share.cid);
      setDecryptProgress("Requesting wallet authorization signature...");

      const challenge = [
        "SecureVault Peer Access Grant Verification",
        `File: ${share.fileName}`,
        `CID: ${share.cid}`,
        `Recipient: ${address.toLowerCase()}`,
        `Owner: ${share.ownerAddress.toLowerCase()}`,
        "Action: Authorize peer key unwrapping and local decryption.",
      ].join("\n");

      await signMessageAsync({ message: challenge });

      setDecryptProgress("Unwrapping peer AES key envelope...");
      const unwrappedKeyHex = await decryptKeyForRecipient(
        share.encryptedKeyForRecipient,
        address,
        share.salt
      );

      setDecryptProgress("Fetching ciphertext from IPFS...");
      const decrypted = await downloadAndDecryptFromIpfs(
        share.cid,
        unwrappedKeyHex,
        undefined,
        (msg) => setDecryptProgress(msg)
      );

      const url = window.URL.createObjectURL(decrypted.plainBlob);
      setReadyDownload({
        name: decrypted.originalName,
        url,
        blob: decrypted.plainBlob,
        mimeType: decrypted.mimeType,
      });
      setActiveNotification(`Decrypted peer file: ${share.fileName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Shared file decryption failed.";
      setActiveNotification(`Decryption error: ${msg}`);
    } finally {
      setDecryptingCid(null);
      setDecryptProgress("");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FR-6: Share with Peer Re-Encryption
  // ─────────────────────────────────────────────────────────────────────────────
  const handleInitiateShare = (file: StoredEncryptedFile) => {
    setSharingFile(file);
    setRecipientInput("");
    setShareNote("");
    setShareError(null);
    setShareSuccess(false);
  };

  const handleExecuteShare = async () => {
    if (!sharingFile || !address) return;
    setShareError(null);

    const trimmed = recipientInput.trim();
    if (!isAddress(trimmed)) {
      setShareError("Invalid Ethereum address. Please enter a valid 0x hex address.");
      return;
    }

    if (trimmed.toLowerCase() === address.toLowerCase()) {
      setShareError("You are already the owner of this file.");
      return;
    }

    try {
      setIsSharing(true);
      const salt = `SALT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const encryptedKeyForRecipient = await reencryptKeyForRecipient(
        sharingFile.keyHex,
        trimmed,
        salt
      );

      recordFileShare({
        id: `share-${Date.now()}`,
        cid: sharingFile.cid,
        fileName: sharingFile.fileName,
        fileSize: sharingFile.fileSize,
        mimeType: sharingFile.mimeType,
        sharedAt: new Date().toISOString(),
        ownerAddress: address.toLowerCase(),
        recipientAddress: trimmed.toLowerCase(),
        encryptedKeyForRecipient,
        salt,
        accessNote: shareNote.trim() || undefined,
      });

      setShareSuccess(true);
      refreshFiles();
      setTimeout(() => {
        setSharingFile(null);
        setShareSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Re-encryption failed.";
      setShareError(msg);
    } finally {
      setIsSharing(false);
    }
  };

  const filteredMyFiles = myFiles.filter((f) =>
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSharedFiles = sharedFiles.filter((f) =>
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.ownerAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="files-header-row p-5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Your Files</span>
            </h2>
            {/* Tab switchers */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab("my_files")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === "my_files"
                    ? "bg-white text-slate-900 font-bold border border-slate-200/90 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "my_files" ? "bg-[#2563EB]" : "bg-transparent"}`} />
                <span>My Vault ({myFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared_with_me")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === "shared_with_me"
                    ? "bg-white text-slate-900 font-bold border border-slate-200/90 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Shared With Me ({sharedFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("activity");
                  fetchActivityLogs();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === "activity"
                    ? "bg-white text-slate-900 font-bold border border-slate-200/90 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Audit Trail ({activityLogs.length})</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === "my_files"
              ? "Sovereign encrypted payloads pinned to IPFS nodes owned by your wallet"
              : activeTab === "shared_with_me"
              ? "Peer-to-peer encrypted payloads shared with your wallet address"
              : "Verifiable cryptographic audit log and vault activity trail"}
          </p>
        </div>

        {/* Search Filter & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="files-search-wrap relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by file or CID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsReceiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors shrink-0"
          >
            <FileDown className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Receive File</span>
          </button>

          <Link
            href="/dashboard/vault"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </Link>
        </div>
      </div>

      {/* Decrypting Progress Notification */}
      {decryptingCid && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-3 flex items-center justify-between gap-3 text-xs font-mono text-blue-900 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
            <span>{decryptProgress}</span>
          </div>
          <span className="text-[11px] text-blue-700 font-semibold">AES-256-GCM Decryption</span>
        </div>
      )}

      {/* Ready Download Direct Link */}
      {readyDownload && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3 flex items-center justify-between gap-4 text-xs font-mono text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Decrypted file ready: <strong className="text-slate-900 font-semibold">{readyDownload.name}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {readyDownload.blob && (
              <button
                type="button"
                onClick={() =>
                  setPreviewModalData({
                    name: readyDownload.name,
                    blob: readyDownload.blob!,
                    mimeType: readyDownload.mimeType,
                    size: readyDownload.blob!.size,
                    url: readyDownload.url,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview (0-Disk)</span>
              </button>
            )}
            <a
              href={readyDownload.url}
              download={readyDownload.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File Now</span>
            </a>
            <button
              type="button"
              onClick={() => {
                if (readyDownload.url) URL.revokeObjectURL(readyDownload.url);
                setReadyDownload(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {activeNotification && !decryptingCid && !readyDownload && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-2.5 flex items-center gap-2 text-xs font-mono text-blue-900 animate-in fade-in duration-200">
          <Info className="h-4 w-4 shrink-0 text-[#2563EB]" />
          <span>{activeNotification}</span>
        </div>
      )}

      {/* TAB 1: MY VAULT FILES */}
      {activeTab === "my_files" && (
        <div className="overflow-x-auto">
          <table className="file-table-mobile-card w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-5">File Name & IPFS CID</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Encryption & Integrity</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Shares</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMyFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* File Name & CID */}
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetailsModalFile(file)}
                          className="truncate max-w-[180px] sm:max-w-xs text-xs font-semibold text-slate-900 hover:text-[#2563EB] text-left transition-colors"
                          title="Click to view file details & chunk map"
                        >
                          {file.fileName}
                        </button>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>CID: {file.cid ? `${file.cid.substring(0, 8)}...${file.cid.slice(-6)}` : "Pending"}</span>
                          {file.cid && (
                            <>
                              <button
                                onClick={() => handleCopy(file.cid, "cid")}
                                title="Copy IPFS CID"
                                type="button"
                                className="hover:text-[#2563EB]"
                              >
                                {copiedCid === file.cid ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              <a
                                href={getIpfsUrl(file.cid)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Raw Ciphertext on IPFS"
                                className="hover:text-[#2563EB] inline-flex items-center gap-0.5"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td data-label="Size" className="py-3.5 px-4 text-slate-600 font-mono">
                    {formatBytes(file.fileSize)}
                  </td>

                  {/* Chunks */}
                  <td data-label="Chunks" className="py-3.5 px-4">
                    <span className="inline-flex items-center font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {file.totalChunks || 1} {file.totalChunks === 1 ? "chunk" : "chunks"}
                    </span>
                  </td>

                  {/* Encryption & Integrity Status */}
                  <td data-label="Security" className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB]">
                        <Check className="h-3 w-3" />
                        AES-256-GCM
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        SHA-256 Verified
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td data-label="Uploaded" className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {new Date(file.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Shares */}
                  <td data-label="Shares" className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {file.sharedWith && file.sharedWith.length > 0 ? (
                      <span className="text-[#2563EB] font-medium">
                        {file.sharedWith.length} Peer{file.sharedWith.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">Private</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td data-label="Actions" className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Drive File Details Modal Button */}
                      <button
                        onClick={() => setDetailsModalFile(file)}
                        type="button"
                        title="View Drive File Details & Chunk Map"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#2563EB] hover:border-blue-300 transition-colors"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      {/* Decrypt Button (Prompts for AES key) */}
                      <button
                        onClick={() => handleOpenDecryptModal(file)}
                        disabled={decryptingCid === file.cid}
                        type="button"
                        title="Decrypt file (requires AES-256 decryption key)"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-all text-xs font-bold shadow-xs"
                      >
                        {decryptingCid === file.cid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <KeyRound className="h-3 w-3" />
                        )}
                        <span>Decrypt</span>
                      </button>

                      {/* Share Securely (Share Code) Button */}
                      <button
                        onClick={() => setSecureShareFile(file)}
                        type="button"
                        title="Share Securely with Human-Readable Code (SV-XXXX-...)"
                        className="p-1.5 rounded-xl border border-blue-200 bg-blue-50/70 text-[#2563EB] hover:bg-blue-100 hover:border-blue-300 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy Key Button */}
                      <button
                        onClick={() => handleCopy(file.keyHex, "key")}
                        type="button"
                        title="Copy AES-256 Hex Key"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#2563EB] hover:border-blue-300 transition-colors"
                      >
                        {copiedKey === file.keyHex ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Delete File Button */}
                      <button
                        onClick={() => setFileToDelete(file)}
                        type="button"
                        title="Delete file from vault"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Screen 11: Empty Vault State */}
          {filteredMyFiles.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <OwlCompanion state="idle" size="md" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Your vault is ready.</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {searchTerm
                    ? "No encrypted files found matching your search."
                    : ownerKey
                    ? "Secure your first file with client-side encryption. Files are encrypted locally before they are uploaded."
                    : "Connect MetaMask or your wallet to access your encrypted file vault."}
                </p>
              </div>
              {ownerKey && !searchTerm && (
                <Link
                  href="/dashboard/vault"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Secure a File</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHARED WITH ME FILES (FR-6) */}
      {activeTab === "shared_with_me" && (
        <div className="overflow-x-auto">
          <table className="file-table-mobile-card w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-5">File Name & CID</th>
                <th className="py-3 px-4">Shared By (Owner)</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Date Shared</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSharedFiles.map((share) => (
                <tr key={share.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* File Name & CID */}
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate max-w-[200px] sm:max-w-xs text-xs font-semibold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                          {share.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>CID: {share.cid.substring(0, 8)}...{share.cid.slice(-6)}</span>
                          <button
                            onClick={() => handleCopy(share.cid, "cid")}
                            title="Copy IPFS CID"
                            type="button"
                            className="hover:text-slate-700"
                          >
                            {copiedCid === share.cid ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Owner Address */}
                  <td data-label="Shared By" className="py-3.5 px-4 text-slate-600">
                    <span className="font-mono text-[11px] text-[#2563EB] font-semibold">
                      {share.ownerAddress.substring(0, 6)}...{share.ownerAddress.slice(-4)}
                    </span>
                    {share.accessNote && (
                      <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[150px]">
                        &quot;{share.accessNote}&quot;
                      </p>
                    )}
                  </td>

                  {/* Size */}
                  <td data-label="Size" className="py-3.5 px-4 text-slate-600 font-mono">
                    {formatBytes(share.fileSize)}
                  </td>

                  {/* Date */}
                  <td data-label="Shared" className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {new Date(share.sharedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td data-label="Actions" className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleSharedDecrypt(share)}
                      disabled={decryptingCid === share.cid}
                      type="button"
                      title="Decrypt Shared Payload with Recipient Signature"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-all text-xs font-semibold"
                    >
                      {decryptingCid === share.cid ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Decrypt Shared</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSharedFiles.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-slate-800 text-xs font-semibold">
                No peer files have been shared with your wallet address yet.
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm">
                When another user re-encrypts a file for your Ethereum address, it will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CRYPTOGRAPHIC AUDIT TRAIL */}
      {activeTab === "activity" && (
        <div className="overflow-x-auto">
          <div className="p-4 bg-slate-50/60 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2563EB]" />
              <span className="text-xs font-bold text-slate-900">Cryptographic Operation Logs</span>
              <span className="text-[11px] font-mono text-slate-500">({activityLogs.length} events)</span>
            </div>
            <button
              type="button"
              onClick={fetchActivityLogs}
              disabled={isLoadingActivity}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-blue-200 shadow-2xs transition-all"
            >
              <RefreshCw className={`h-3 w-3 text-[#2563EB] ${isLoadingActivity ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-5 text-right">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {activityLogs.map((log) => {
                let badgeClass = "bg-slate-50 text-slate-700 border-slate-200";
                if (log.eventType === "wallet_authenticated") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                else if (log.eventType.includes("encryption")) badgeClass = "bg-blue-50 text-[#2563EB] border-blue-200";
                else if (log.eventType.includes("upload")) badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                else if (log.eventType.includes("integrity")) badgeClass = "bg-teal-50 text-teal-700 border-teal-200";
                else if (log.eventType === "share_created") badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                else if (log.eventType === "share_accessed") badgeClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
                else if (log.eventType === "share_revoked" || log.eventType === "file_deleted") badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                else if (log.eventType.includes("key")) badgeClass = "bg-violet-50 text-violet-700 border-violet-200";

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 whitespace-nowrap text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                        {log.eventType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800 text-xs font-medium">
                      {log.description}
                    </td>
                    <td className="py-3 px-5 text-right text-[11px] text-slate-400">
                      {log.metadata?.shareCode ? (
                        <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {String(log.metadata.shareCode)}
                        </span>
                      ) : log.metadata?.fileId ? (
                        <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          ID: {String(log.metadata.fileId).slice(0, 10)}...
                        </span>
                      ) : (
                        <span>Verified</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {activityLogs.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-slate-800 text-xs font-semibold">
                No audit activity recorded yet.
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Authenticating, encrypting files, uploading to IPFS, and generating secure share codes will populate this cryptographically verified audit trail.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table Footer Note */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Zero Server Plaintext • 100% Client-Side Web Crypto Verification</span>
        </div>
        <div className="text-slate-600 font-mono text-[11px]">
          Connected: {address ? `${address.substring(0, 6)}...${address.slice(-4)}` : "None"}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FR-6: Share with Peer Modal
          ───────────────────────────────────────────────────────────────────────────── */}
      {sharingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="responsive-modal w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Share with Peer</span>
                  <p className="text-[11px] text-slate-500 font-normal">Re-encrypt key for recipient Ethereum address</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
              <div className="text-slate-500 truncate">File: <span className="text-slate-900 font-semibold">{sharingFile.fileName}</span></div>
              <div className="text-slate-500 truncate text-[11px]">CID: <span className="text-[#2563EB]">{sharingFile.cid}</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Recipient Ethereum Address (0x...)
                </label>
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="0x71C... or recipient wallet"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Access Note (Optional)
                </label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="e.g., Confidential Q3 Audit for Review"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            {shareError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            {shareSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Re-encrypted file key & granted access to peer!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteShare}
                disabled={isSharing || shareSuccess}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Re-encrypting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Re-Encrypt & Grant Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Screen 12: Decrypt Key Prompt Modal with Owl Companion
          ───────────────────────────────────────────────────────────────────────────── */}
      {decryptModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="responsive-modal w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold">
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enter Decryption Key</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Zero-knowledge client-side decryption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDecryptModal}
                disabled={isDecryptingModal}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Owl Decryption Companion Box */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-center gap-3.5">
              <OwlCompanion state="decrypting" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900">Guardian Verification</div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  &ldquo;I&apos;m ready to bring your file back. Decryption happens entirely in your browser.&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-mono">
                  <span>Retrieve chunks</span>
                  <span>→</span>
                  <span>Verify tag</span>
                  <span>→</span>
                  <span>Decrypt locally</span>
                </div>
              </div>
            </div>

            {/* Target File Overview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-900">
                <span className="text-slate-500 font-sans">File Name:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[260px]">{decryptModalFile.fileName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-slate-500 font-sans">IPFS CID:</span>
                <span className="truncate max-w-[260px] text-[#2563EB] font-mono text-[11px]">{decryptModalFile.cid}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-slate-500 font-sans">Payload Size:</span>
                <span className="text-slate-800">{formatBytes(decryptModalFile.fileSize)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-slate-500 font-sans">Algorithm:</span>
                <span className="text-[#2563EB] font-semibold">AES-256-GCM (Authenticated)</span>
              </div>
            </div>

            {/* Key Input Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  AES-256 Key (64 hex characters)
                </label>
                {decryptModalFile.keyHex && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualKeyInput(decryptModalFile.keyHex);
                      setDecryptModalError(null);
                    }}
                    className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Use Saved Vault Key</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKeyInput ? "text" : "password"}
                  value={manualKeyInput}
                  onChange={(e) => {
                    setManualKeyInput(e.target.value.trim());
                    setDecryptModalError(null);
                  }}
                  placeholder="Paste 64-character hexadecimal AES key..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Key length: {manualKeyInput.length} / 64 hex characters</span>
                {manualKeyInput.length === 64 && /^[0-9a-fA-F]{64}$/.test(manualKeyInput) ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-sans font-semibold">
                    <Check className="h-3 w-3" /> Valid 256-bit format
                  </span>
                ) : null}
              </div>
            </div>

            {/* Error Message */}
            {decryptModalError && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{decryptModalError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseDecryptModal}
                disabled={isDecryptingModal}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={manualKeyInput.length !== 64 || isDecryptingModal}
                onClick={handleConfirmDecryptWithKey}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isDecryptingModal ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Decrypting Payload...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Unlock & Decrypt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive-Style File Details Modal */}
      <FileDetailsModal
        isOpen={!!detailsModalFile}
        onClose={() => setDetailsModalFile(null)}
        fileId={detailsModalFile?.id || null}
        localKeyHex={detailsModalFile?.keyHex || null}
        vaultXId={vaultXIdentity?.id}
        onDelete={
          detailsModalFile
            ? () => {
                const target = detailsModalFile;
                setDetailsModalFile(null);
                setFileToDelete(target);
              }
            : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="responsive-modal w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Delete File from Vault</span>
                  <p className="text-[11px] text-slate-500 font-normal">Remove encrypted payload and metadata</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-500 font-mono truncate">
                File: <span className="text-slate-900 font-semibold font-sans">{fileToDelete.fileName}</span>
              </div>
              {fileToDelete.cid && (
                <div className="text-slate-500 font-mono truncate text-[11px]">
                  CID: <span className="text-[#2563EB]">{fileToDelete.cid}</span>
                </div>
              )}
              <div className="text-slate-500 font-mono text-[11px]">
                Size: <span className="text-slate-700 font-medium">{formatBytes(fileToDelete.fileSize)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove this file from your vault? This will permanently delete the file metadata, chunks, and local references.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Secure Share Code Modal */}
      {secureShareFile && (
        <CreateSecureShareModal
          isOpen={!!secureShareFile}
          onClose={() => setSecureShareFile(null)}
          file={secureShareFile}
          vaultXId={ownerKey}
          onShareCreated={() => {
            refreshFiles();
          }}
        />
      )}

      {/* Receive Secure File Modal */}
      <ReceiveSecureFileModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
      />

      {/* In-Browser Zero-Disk Secure Preview Modal */}
      <SecureFilePreviewModal
        isOpen={Boolean(previewModalData)}
        onClose={() => setPreviewModalData(null)}
        previewData={previewModalData}
      />
    </div>
  );
}
