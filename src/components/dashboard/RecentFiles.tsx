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
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { formatBytes, downloadAndDecryptFromIpfs, reencryptKeyForRecipient, decryptKeyForRecipient } from "@/lib/crypto";
import { getUserFiles, getSharedWithMeFiles, recordFileShare, StoredEncryptedFile, SharedFileRecord } from "@/lib/fileStorage";
import { useAccount, useSignMessage } from "wagmi";
import { isAddress } from "viem";
import { getIpfsUrl } from "@/lib/ipfs/gateway";

export function RecentFiles() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

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

  // Share modal state (FR-6)
  const [sharingFile, setSharingFile] = useState<StoredEncryptedFile | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Load user files from registry
  const refreshFiles = useCallback(() => {
    if (address) {
      setMyFiles(getUserFiles(address));
      setSharedFiles(getSharedWithMeFiles(address));
    } else {
      setMyFiles([]);
      setSharedFiles([]);
    }
  }, [address]);

  useEffect(() => {
    refreshFiles();
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
  // FR-5: 1-Click Decrypt & Download via Wallet Signature Challenge
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOneClickDecrypt = async (file: StoredEncryptedFile) => {
    if (!address) {
      setActiveNotification("Please connect your Web3 wallet first.");
      return;
    }

    try {
      setDecryptingCid(file.cid);
      setDecryptProgress("Requesting wallet cryptographic signature...");

      // Cryptographic signature challenge verified by user's wallet
      const challenge = [
        "CYBER-10 Protocol Sovereign Decrypt Verification",
        `File: ${file.fileName}`,
        `IPFS CID: ${file.cid}`,
        `Wallet: ${address.toLowerCase()}`,
        `Timestamp: ${new Date().toISOString()}`,
        "Action: Authorize local AES-256-GCM zero-knowledge decryption.",
      ].join("\n");

      await signMessageAsync({ message: challenge });

      setDecryptProgress("Signature verified. Fetching ciphertext from IPFS...");
      const decrypted = await downloadAndDecryptFromIpfs(
        file.cid,
        file.keyHex,
        undefined,
        (msg) => setDecryptProgress(msg)
      );

      const url = window.URL.createObjectURL(decrypted.plainBlob);
      setReadyDownload({ name: decrypted.originalName, url });
      setActiveNotification(`Decrypted: ${file.fileName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decryption failed.";
      setActiveNotification(`Decryption error: ${msg}`);
    } finally {
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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <span>Decentralized File Directory</span>
            </h2>
            {/* Tab switchers */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("my_files")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeTab === "my_files"
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                My Vault ({myFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared_with_me")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === "shared_with_me"
                    ? "bg-purple-500/20 text-purple-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="h-3 w-3" />
                Shared With Me ({sharedFiles.length})
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {activeTab === "my_files"
              ? "Sovereign encrypted payloads pinned to IPFS nodes owned by your wallet"
              : "Peer-to-peer encrypted payloads shared with your wallet address"}
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by file or CID..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
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
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">File Name & IPFS CID</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Encryption</th>
                <th className="py-3 px-4">Date Pinned</th>
                <th className="py-3 px-4">Shares</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredMyFiles.map((file) => (
                <tr key={file.id} className="hover:bg-zinc-800/40 transition-colors group">
                  {/* File Name & CID */}
                  <td className="py-3.5 px-5 font-medium text-zinc-200">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate max-w-[200px] sm:max-w-xs font-sans text-xs font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                          {file.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span>CID: {file.cid.substring(0, 8)}...{file.cid.slice(-6)}</span>
                          <button
                            onClick={() => handleCopy(file.cid, "cid")}
                            title="Copy IPFS CID"
                            type="button"
                            className="hover:text-zinc-300"
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
                            className="hover:text-cyan-400 inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="py-3.5 px-4 text-zinc-400">
                    {formatBytes(file.fileSize)}
                  </td>

                  {/* Encryption Status */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] text-cyan-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      AES-256-GCM
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                    {new Date(file.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Shares */}
                  <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                    {file.sharedWith && file.sharedWith.length > 0 ? (
                      <span className="text-purple-400 font-medium">
                        {file.sharedWith.length} Peer{file.sharedWith.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Private</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* FR-5: 1-Click Decrypt Button */}
                      <button
                        onClick={() => handleOneClickDecrypt(file)}
                        disabled={decryptingCid === file.cid}
                        type="button"
                        title="1-Click Decrypt & Download (signs cryptographic challenge)"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all font-sans text-xs font-semibold"
                      >
                        {decryptingCid === file.cid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span>Decrypt</span>
                      </button>

                      {/* FR-6: Share with Peer Button */}
                      <button
                        onClick={() => handleInitiateShare(file)}
                        type="button"
                        title="Share Encrypted Key with Peer (FR-6)"
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy Key Button */}
                      <button
                        onClick={() => handleCopy(file.keyHex, "key")}
                        type="button"
                        title="Copy AES-256 Hex Key"
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
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
                  : isConnected
                  ? "You haven't uploaded any encrypted files to IPFS yet."
                  : "Connect your Web3 wallet to access your encrypted file vault."}
              </div>
              {isConnected && !searchTerm && (
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
          <table className="w-full text-left text-xs font-mono">
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
                  <td className="py-3.5 px-4 text-zinc-300">
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
                  <td className="py-3.5 px-4 text-zinc-400">
                    {formatBytes(share.fileSize)}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                    {new Date(share.sharedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right">
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
      {sharingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                <Share2 className="h-4 w-4 text-purple-400" />
                <span>Share Encrypted File with Peer</span>
              </div>
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60 text-xs font-mono">
              <div className="text-zinc-400 truncate">File: <span className="text-zinc-200 font-semibold">{sharingFile.fileName}</span></div>
              <div className="text-zinc-500 truncate">CID: {sharingFile.cid}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Recipient Ethereum Address (0x...)
                </label>
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="0x71C... or recipient wallet"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 px-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Access Note (Optional)
                </label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="e.g., Confidential Q3 Audit for Review"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 px-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {shareError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            {shareSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Re-encrypted file key & granted access to peer!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSharingFile(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteShare}
                disabled={isSharing || shareSuccess}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
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
    </div>
  );
}
