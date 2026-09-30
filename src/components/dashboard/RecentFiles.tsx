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
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { formatBytes, downloadAndDecryptFromIpfs, reencryptKeyForRecipient, decryptKeyForRecipient } from "@/lib/crypto";
import { getUserFiles, getAllVaultFiles, getSharedWithMeFiles, recordFileShare, StoredEncryptedFile, SharedFileRecord } from "@/lib/fileStorage";
import { useAccount, useSignMessage } from "wagmi";
import { isAddress } from "viem";
import { getIpfsUrl } from "@/lib/ipfs/gateway";
import { useVaultXWallet } from "@/context/VaultXWalletContext";

export function RecentFiles() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { identity: vaultXIdentity, isConnected: isVaultXConnected } = useVaultXWallet();

  // Resolved owner key: MetaMask address takes precedence, fall back to VaultX id
  const ownerKey = address?.toLowerCase() ?? (isVaultXConnected ? vaultXIdentity?.id : null) ?? null;

  const [activeTab, setActiveTab] = useState<"my_files" | "shared_with_me">("my_files");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Directory state
  const [myFiles, setMyFiles] = useState<StoredEncryptedFile[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFileRecord[]>([]);

  // Decryption state (FR-5)
  const [decryptingCid, setDecryptingCid] = useState<string | null>(null);
  const [decryptProgress, setDecryptProgress] = useState<string>("");
  const [readyDownload, setReadyDownload] = useState<{ name: string; url: string } | null>(null);

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

  // Load all user files from registry — comprehensive search across all known addresses and local keys
  const refreshFiles = useCallback(() => {
    const allFiles = getAllVaultFiles([address, vaultXIdentity?.id]);
    setMyFiles(allFiles);
    setSharedFiles(address ? getSharedWithMeFiles(address) : []);
  }, [address, vaultXIdentity]);

  useEffect(() => {
    refreshFiles();
    const handleFocus = () => refreshFiles();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
    };
  }, [refreshFiles]);


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
  // Prompts user for the 256-bit AES key before decrypting from IPFS
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
      setReadyDownload({ name: decrypted.originalName, url });
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
        "CYBER-10 Peer Access Grant Verification",
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
      setReadyDownload({ name: decrypted.originalName, url });
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
  // FR-6: Token-Gated / Peer File Sharing Re-Encryption
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
      
      // Re-encrypt the file key specifically for the recipient's wallet
      const encryptedKeyForRecipient = await reencryptKeyForRecipient(
        sharingFile.keyHex,
        trimmed,
        salt
      );

      // Record the share in the decentralized registry
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
    <div className="rounded-2xl border border-[#3b4046] bg-[#1e2024] shadow-xl shadow-black/20 overflow-hidden">
      {/* Table Header Controls */}
      <div className="files-header-row p-5 border-b border-[#2e3238] bg-[#141618] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#f2f4f6] flex items-center gap-2">
              <span>Decentralized File Directory</span>
            </h2>
            {/* MetaMask Portfolio Tab switchers */}
            <div className="flex items-center gap-1 rounded-xl border border-[#3b4046] bg-[#1e2024] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("my_files")}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === "my_files"
                    ? "bg-[#2b2f34] text-[#f2f4f6] font-bold border border-[#3b4046]"
                    : "text-[#848c96] hover:text-[#f2f4f6]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "my_files" ? "bg-[#f6851b]" : "bg-transparent"}`} />
                <span>My Vault ({myFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared_with_me")}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === "shared_with_me"
                    ? "bg-[#2b2f34] text-[#f2f4f6] font-bold border border-[#3b4046]"
                    : "text-[#848c96] hover:text-[#f2f4f6]"
                }`}
              >
                <Users className="h-3 w-3 text-[#037dd6]" />
                <span>Shared With Me ({sharedFiles.length})</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-[#848c96] mt-1">
            {activeTab === "my_files"
              ? "Sovereign encrypted payloads pinned to IPFS nodes owned by your wallet"
              : "Peer-to-peer encrypted payloads shared with your wallet address"}
          </p>
        </div>

        {/* Search Filter */}
        <div className="files-search-wrap relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#848c96]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by file or CID..."
            className="w-full rounded-xl border border-[#3b4046] bg-[#1e2024] py-1.5 pl-8 pr-3 text-xs text-[#f2f4f6] placeholder:text-[#6a737d] focus:border-[#f6851b] focus:outline-none"
          />
        </div>
      </div>

      {/* Decrypting Progress Notification */}
      {decryptingCid && (
        <div className="bg-cyan-950/40 border-b border-cyan-500/40 px-5 py-3 flex items-center justify-between gap-3 text-xs font-mono text-cyan-300 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            <span>{decryptProgress}</span>
          </div>
          <span className="text-[11px] text-zinc-400">AES-256-GCM Decryption</span>
        </div>
      )}

      {/* Ready Download Direct Link */}
      {readyDownload && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/40 px-5 py-3 flex items-center justify-between gap-4 text-xs font-mono text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Decrypted file ready: <strong className="text-white font-semibold">{readyDownload.name}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={readyDownload.url}
              download={readyDownload.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shrink-0 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File Now</span>
            </a>
            <button
              type="button"
              onClick={() => setReadyDownload(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {activeNotification && !decryptingCid && !readyDownload && (
        <div className="bg-cyan-950/30 border-b border-cyan-500/30 px-5 py-2.5 flex items-center gap-2 text-xs font-mono text-cyan-300 animate-in fade-in duration-200">
          <Info className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>{activeNotification}</span>
        </div>
      )}

      {/* TAB 1: MY VAULT FILES */}
      {activeTab === "my_files" && (
        <div className="overflow-x-auto">
          <table className="file-table-mobile-card w-full text-left text-xs font-mono">
            <thead className="border-b border-[#2e3238] bg-[#141618] text-[#848c96] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">File Name & IPFS CID</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Encryption</th>
                <th className="py-3 px-4">Date Pinned</th>
                <th className="py-3 px-4">Shares</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e3238]">
              {filteredMyFiles.map((file) => (
                <tr key={file.id} className="hover:bg-[#24272a] transition-colors group">
                  {/* File Name & CID */}
                  <td className="py-3.5 px-5 font-medium text-[#f2f4f6]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-[#141618] border border-[#3b4046] flex items-center justify-center text-[#f6851b] shrink-0">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate max-w-[200px] sm:max-w-xs font-sans text-xs font-semibold text-[#f2f4f6] group-hover:text-[#f6851b] transition-colors">
                          {file.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#848c96]">
                          <span>CID: {file.cid.substring(0, 8)}...{file.cid.slice(-6)}</span>
                          <button
                            onClick={() => handleCopy(file.cid, "cid")}
                            title="Copy IPFS CID"
                            type="button"
                            className="hover:text-[#f6851b]"
                          >
                            {copiedCid === file.cid ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          <a
                            href={getIpfsUrl(file.cid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Raw Ciphertext on IPFS"
                            className="hover:text-[#f6851b] inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td data-label="Size" className="py-3.5 px-4 text-[#848c96]">
                    {formatBytes(file.fileSize)}
                  </td>

                  {/* Encryption Status */}
                  <td data-label="Encryption" className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f6851b]/35 bg-[#f6851b]/15 px-2.5 py-0.5 text-[10px] text-[#f6851b] font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f6851b]" />
                      AES-256-GCM
                    </span>
                  </td>

                  {/* Date */}
                  <td data-label="Date" className="py-3.5 px-4 text-[#848c96] text-[11px]">
                    {new Date(file.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Shares */}
                  <td data-label="Shares" className="py-3.5 px-4 text-[#848c96] text-[11px]">
                    {file.sharedWith && file.sharedWith.length > 0 ? (
                      <span className="text-[#037dd6] font-medium">
                        {file.sharedWith.length} Peer{file.sharedWith.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[#6a737d]">Private</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td data-label="Actions" className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Decrypt Button (Prompts for AES key) */}
                      <button
                        onClick={() => handleOpenDecryptModal(file)}
                        disabled={decryptingCid === file.cid}
                        type="button"
                        title="Decrypt file (requires AES-256 decryption key)"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#f6851b] hover:bg-[#e2761b] active:bg-[#cd6116] text-[#141618] transition-all font-sans text-xs font-bold shadow-sm shadow-[#f6851b]/20"
                      >
                        {decryptingCid === file.cid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <KeyRound className="h-3 w-3" />
                        )}
                        <span>Decrypt</span>
                      </button>

                      {/* FR-6: Share with Peer Button */}
                      <button
                        onClick={() => handleInitiateShare(file)}
                        type="button"
                        title="Share Encrypted Key with Peer (FR-6)"
                        className="p-1.5 rounded-xl border border-[#3b4046] bg-[#141618] text-[#848c96] hover:text-[#037dd6] hover:border-[#037dd6]/40 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy Key Button */}
                      <button
                        onClick={() => handleCopy(file.keyHex, "key")}
                        type="button"
                        title="Copy AES-256 Hex Key"
                        className="p-1.5 rounded-xl border border-[#3b4046] bg-[#141618] text-[#848c96] hover:text-[#f6851b] hover:border-[#f6851b]/40 transition-colors"
                      >
                        {copiedKey === file.keyHex ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMyFiles.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center mx-auto text-zinc-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-zinc-400 text-xs">
                {searchTerm
                  ? "No encrypted files found matching your search."
                  : ownerKey
                  ? "You haven't uploaded any encrypted files to IPFS yet."
                  : "Connect MetaMask or VaultX Secure Wallet to access your encrypted file vault."}
              </div>
              {ownerKey && !searchTerm && (
                <Link
                  href="/dashboard/vault"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold pt-1"
                >
                  <span>Go to Vault & Encrypt File</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHARED WITH ME FILES (FR-6) */}
      {activeTab === "shared_with_me" && (
        <div className="overflow-x-auto">
          <table className="file-table-mobile-card w-full text-left text-xs font-mono">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">File Name & CID</th>
                <th className="py-3 px-4">Shared By (Owner)</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Date Shared</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredSharedFiles.map((share) => (
                <tr key={share.id} className="hover:bg-zinc-800/40 transition-colors group">
                  {/* File Name & CID */}
                  <td className="py-3.5 px-5 font-medium text-zinc-200">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-purple-950/30 border border-purple-800/40 flex items-center justify-center text-purple-400 shrink-0">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate max-w-[200px] sm:max-w-xs font-sans text-xs font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">
                          {share.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span>CID: {share.cid.substring(0, 8)}...{share.cid.slice(-6)}</span>
                          <button
                            onClick={() => handleCopy(share.cid, "cid")}
                            title="Copy IPFS CID"
                            type="button"
                            className="hover:text-zinc-300"
                          >
                            {copiedCid === share.cid ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Owner Address */}
                  <td data-label="Shared By" className="py-3.5 px-4 text-zinc-300">
                    <span className="font-mono text-[11px] text-cyan-400">
                      {share.ownerAddress.substring(0, 6)}...{share.ownerAddress.slice(-4)}
                    </span>
                    {share.accessNote && (
                      <p className="text-[10px] text-zinc-500 italic mt-0.5 truncate max-w-[150px]">
                        &quot;{share.accessNote}&quot;
                      </p>
                    )}
                  </td>

                  {/* Size */}
                  <td data-label="Size" className="py-3.5 px-4 text-zinc-400">
                    {formatBytes(share.fileSize)}
                  </td>

                  {/* Date */}
                  <td data-label="Shared" className="py-3.5 px-4 text-zinc-500 text-[11px]">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-purple-500/30 bg-purple-950/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 transition-all font-sans text-xs font-semibold"
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
            <div className="p-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center mx-auto text-zinc-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-zinc-400 text-xs">
                No peer files have been shared with your wallet address yet.
              </div>
              <p className="text-[11px] text-zinc-600">
                When another user re-encrypts a file for your Ethereum address, it will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table Footer Note */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Zero Server Plaintext • 100% Client-Side Web Crypto Verification</span>
        </div>
        <div className="text-zinc-600">
          Connected: {address ? `${address.substring(0, 6)}...${address.slice(-4)}` : "None"}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FR-6: Share with Peer Modal
          ───────────────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────────────────
          FR-6: Share with Peer Modal (MetaMask Design)
          ───────────────────────────────────────────────────────────────────────────── */}
      {sharingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="responsive-modal w-full max-w-md rounded-2xl border border-[#3B4046] bg-[#1E2024] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2E3238]">
              <div className="flex items-center gap-2.5 text-[#F2F4F6] font-semibold text-sm">
                <div className="h-8 w-8 rounded-lg bg-[#F6851B]/15 border border-[#F6851B]/30 flex items-center justify-center text-[#F6851B]">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-white">Share with Peer</span>
                  <p className="text-[11px] text-[#848C96] font-normal">Re-encrypt key for recipient Ethereum address</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="text-[#848C96] hover:text-white p-1 rounded-lg hover:bg-[#2B2F34] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 bg-[#141618] p-3 rounded-xl border border-[#2E3238] text-xs font-mono">
              <div className="text-[#848C96] truncate">File: <span className="text-[#F2F4F6] font-semibold">{sharingFile.fileName}</span></div>
              <div className="text-[#848C96] truncate text-[11px]">CID: <span className="text-[#037DD6]">{sharingFile.cid}</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#F2F4F6] mb-1">
                  Recipient Ethereum Address (0x...)
                </label>
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="0x71C... or recipient wallet"
                  className="w-full rounded-xl border border-[#3B4046] bg-[#141618] py-2 px-3 text-xs font-mono text-[#F2F4F6] placeholder:text-[#848C96] focus:border-[#F6851B] focus:ring-1 focus:ring-[#F6851B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#848C96] mb-1">
                  Access Note (Optional)
                </label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="e.g., Confidential Q3 Audit for Review"
                  className="w-full rounded-xl border border-[#3B4046] bg-[#141618] py-2 px-3 text-xs text-[#F2F4F6] placeholder:text-[#848C96] focus:border-[#F6851B] focus:ring-1 focus:ring-[#F6851B] focus:outline-none"
                />
              </div>
            </div>

            {shareError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-red-500/30 bg-red-950/20 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            {shareSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Re-encrypted file key & granted access to peer!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2E3238]">
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] rounded-xl hover:bg-[#2B2F34] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteShare}
                disabled={isSharing || shareSuccess}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
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
          Decrypt Key Prompt Modal (MetaMask Design)
          Prompts user for AES-256 key before decrypting and downloading
          ───────────────────────────────────────────────────────────────────────────── */}
      {decryptModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="responsive-modal w-full max-w-lg rounded-2xl border border-[#3B4046] bg-[#1E2024] p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2E3238]">
              <div className="flex items-center gap-2.5 text-[#F2F4F6] font-semibold">
                <div className="h-8 w-8 rounded-lg bg-[#F6851B]/15 border border-[#F6851B]/30 flex items-center justify-center text-[#F6851B]">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enter Decryption Key</h3>
                  <p className="text-[11px] text-[#848C96] font-normal">Zero-knowledge client-side decryption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDecryptModal}
                disabled={isDecryptingModal}
                className="text-[#848C96] hover:text-[#F2F4F6] disabled:opacity-50 p-1 rounded-lg hover:bg-[#2B2F34] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target File Overview */}
            <div className="p-3.5 rounded-xl bg-[#141618] border border-[#2E3238] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[#F2F4F6]">
                <span className="text-[#848C96] font-sans">File Name:</span>
                <span className="font-semibold text-white truncate max-w-[260px]">{decryptModalFile.fileName}</span>
              </div>
              <div className="flex justify-between items-center text-[#848C96]">
                <span className="text-[#848C96] font-sans">IPFS CID:</span>
                <span className="truncate max-w-[260px] text-[#037DD6] font-mono text-[11px]">{decryptModalFile.cid}</span>
              </div>
              <div className="flex justify-between items-center text-[#848C96]">
                <span className="text-[#848C96] font-sans">Payload Size:</span>
                <span className="text-[#F2F4F6]">{formatBytes(decryptModalFile.fileSize)}</span>
              </div>
              <div className="flex justify-between items-center text-[#848C96]">
                <span className="text-[#848C96] font-sans">Algorithm:</span>
                <span className="text-[#F6851B]">AES-256-GCM (Authenticated)</span>
              </div>
            </div>

            {/* Key Input Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#F2F4F6]">
                  AES-256 Key (64 hex characters)
                </label>
                {decryptModalFile.keyHex && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualKeyInput(decryptModalFile.keyHex);
                      setDecryptModalError(null);
                    }}
                    className="text-[11px] font-medium text-[#F6851B] hover:text-[#E2761B] flex items-center gap-1 underline underline-offset-2"
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
                  className="w-full rounded-xl border border-[#3B4046] bg-[#141618] py-2.5 pl-3 pr-10 text-xs font-mono text-[#F2F4F6] placeholder:text-[#848C96] focus:border-[#F6851B] focus:ring-1 focus:ring-[#F6851B] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#848C96] hover:text-white"
                >
                  {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#848C96]">
                <span>Key length: {manualKeyInput.length} / 64 hex characters</span>
                {manualKeyInput.length === 64 && /^[0-9a-fA-F]{64}$/.test(manualKeyInput) ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-sans">
                    <Check className="h-3 w-3" /> Valid 256-bit format
                  </span>
                ) : null}
              </div>
            </div>

            {/* Error Message */}
            {decryptModalError && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/40 bg-red-950/20 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{decryptModalError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2E3238]">
              <button
                type="button"
                onClick={handleCloseDecryptModal}
                disabled={isDecryptingModal}
                className="px-4 py-2 text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] rounded-xl hover:bg-[#2B2F34] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={manualKeyInput.length !== 64 || isDecryptingModal}
                onClick={handleConfirmDecryptWithKey}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
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
    </div>
  );
}
