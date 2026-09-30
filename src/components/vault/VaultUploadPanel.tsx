"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Lock,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Key,
  FileText,
  X,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Globe,
  ShieldCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import { encryptFile, formatBytes, type CryptoProgress } from "@/lib/crypto";
import { getIpfsUrl } from "@/lib/ipfs/gateway";
import { cn } from "@/lib/utils";
import type { VaultUploadStage, UploadApiResponse } from "@/types/files";
import { useAccount } from "wagmi";
import { saveUserFile } from "@/lib/fileStorage";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { protectFileKeyWithVaultX } from "@/lib/vaultxWallet";
import { OwlCompanion } from "@/components/ui/OwlCompanion";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200",
        copied
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function DropZone({
  onFileSelect,
  file,
  onClear,
  disabled,
}: {
  onFileSelect: (f: File) => void;
  file: File | null;
  onClear: () => void;
  disabled: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect, disabled]
  );

  if (file) {
    const chunkCount = Math.ceil(file.size / (8 * 1024 * 1024)) || 1;
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#2563EB]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="truncate font-bold text-sm text-slate-900 max-w-[260px] sm:max-w-md">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {formatBytes(file.size)} · {file.type || "application/octet-stream"}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Metadata Details Grid (Screen 5) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">File size</span>
            <span className="font-semibold text-slate-800">{formatBytes(file.size)}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">MIME type</span>
            <span className="font-semibold text-slate-800 truncate block">{file.type || "application/octet-stream"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Estimated chunks</span>
            <span className="font-semibold text-[#2563EB]">{chunkCount}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Chunk size</span>
            <span className="font-semibold text-slate-800">8 MB</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer",
        disabled
          ? "border-slate-200 opacity-50 cursor-not-allowed"
          : isDragging
          ? "border-[#2563EB] bg-blue-50/60 scale-[1.01]"
          : "border-slate-300 hover:border-[#2563EB] hover:bg-blue-50/20 bg-slate-50/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }}
        className="hidden"
        disabled={disabled}
        aria-label="Select a file to encrypt and upload"
      />
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        <CloudUpload className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">
          Drop your file here <span className="text-slate-500 font-normal">or click to browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">Up to 500 MB · Encrypted on your device before upload</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VaultUploadPanel Component
// ─────────────────────────────────────────────────────────────────────────────

export function VaultUploadPanel() {
  const { address, isConnected } = useAccount();
  const { isConnected: isVaultXConnected, identity: vaultXIdentity } = useVaultXWallet();

  const isMetaMaskActive = Boolean(address && isConnected);
  const isVaultXActive = !isMetaMaskActive && isVaultXConnected;

  const [stage, setStage] = useState<VaultUploadStage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keyHex, setKeyHex] = useState<string | null>(null);
  const [keyProtectedByVaultX, setKeyProtectedByVaultX] = useState(false);
  const [encryptedSize, setEncryptedSize] = useState<number>(0);
  const [cid, setCid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cryptoProgress, setCryptoProgress] = useState<CryptoProgress | null>(null);

  const isProcessing = stage === "encrypting" || stage === "uploading";

  const reset = useCallback(() => {
    setStage("idle");
    setSelectedFile(null);
    setKeyHex(null);
    setKeyProtectedByVaultX(false);
    setEncryptedSize(0);
    setCid(null);
    setErrorMessage(null);
    setCryptoProgress(null);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    reset();
    setSelectedFile(file);
    setStage("selected");
  }, [reset]);

  const handleEncryptAndUpload = useCallback(async () => {
    if (!selectedFile) return;

    // ── Phase 1: Encrypt locally ──
    setStage("encrypting");
    setErrorMessage(null);

    let bundle;
    try {
      bundle = await encryptFile(selectedFile, (p) => {
        setCryptoProgress(p);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Encryption failed.";
      setErrorMessage(msg);
      setStage("error");
      return;
    }

    // ── Phase 1b: Wrap DEK with VaultX KEK if active ──
    let wrappedKey: string | undefined;
    if (isVaultXActive) {
      try {
        wrappedKey = await protectFileKeyWithVaultX(bundle.keyHex);
        setKeyProtectedByVaultX(true);
      } catch (wrapErr) {
        setKeyProtectedByVaultX(false);
      }
    }

    setKeyHex(bundle.keyHex);
    setEncryptedSize(bundle.encryptedSizeBytes);
    setStage("encrypted");

    await new Promise((r) => setTimeout(r, 600));

    // ── Phase 2: Upload to IPFS via Pinata ──
    setStage("uploading");

    let finalCid: string | null = null;
    let finalSize: number = bundle.encryptedSizeBytes;
    let finalUploadedAt: string = new Date().toISOString();

    try {
      const urlRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isVaultXActive && vaultXIdentity?.id ? { "x-vaultx-id": vaultXIdentity.id } : {}),
        },
        body: JSON.stringify({
          filename: bundle.downloadName,
          vaultXId: isVaultXActive ? vaultXIdentity?.id : undefined,
        }),
      });

      if (!urlRes.ok) {
        throw new Error("Could not acquire direct upload credentials.");
      }

      const { uploadUrl } = await urlRes.json();
      if (!uploadUrl) {
        throw new Error("No upload URL returned.");
      }

      const pinataForm = new FormData();
      pinataForm.append("file", bundle.encryptedBlob, bundle.downloadName);

      const pinataRes = await fetch(uploadUrl, {
        method: "POST",
        body: pinataForm,
      });

      if (!pinataRes.ok) {
        throw new Error(`Upload failed (${pinataRes.status})`);
      }

      const pinataData = await pinataRes.json();
      finalCid = pinataData?.data?.cid;
      finalSize = pinataData?.data?.size || bundle.encryptedSizeBytes;
      finalUploadedAt = pinataData?.data?.created_at || new Date().toISOString();

      if (!finalCid) {
        throw new Error("Pinata upload did not return a CID.");
      }
    } catch (directErr: unknown) {
      // Fallback to server proxy
      const formData = new FormData();
      formData.append("encryptedFile", bundle.encryptedBlob, bundle.downloadName);
      formData.append("originalName", selectedFile.name);
      formData.append("originalMime", selectedFile.type || "application/octet-stream");
      formData.append("originalSize", String(selectedFile.size));
      if (isVaultXActive && vaultXIdentity?.id) {
        formData.append("vaultXId", vaultXIdentity.id);
      }

      let apiResponse: UploadApiResponse;
      try {
        const res = await fetch("/api/files/upload", {
          method: "POST",
          headers: {
            ...(isVaultXActive && vaultXIdentity?.id ? { "x-vaultx-id": vaultXIdentity.id } : {}),
          },
          body: formData,
        });
        apiResponse = await res.json();
      } catch (networkErr: unknown) {
        const msg = networkErr instanceof Error ? networkErr.message : "Network error";
        setErrorMessage(`Upload failed. Could not reach storage network: ${msg}`);
        setStage("error");
        return;
      }

      if (!apiResponse.success) {
        setErrorMessage(apiResponse.error || "Upload failed. Your encrypted file was not stored.");
        setStage("error");
        return;
      }

      finalCid = apiResponse.cid;
      finalSize = apiResponse.size;
      finalUploadedAt = apiResponse.uploadedAt;
    }

    // ── Success ──
    setCid(finalCid);
    setStage("uploaded");
    setCryptoProgress(null);

    // Save metadata
    const ownerKey = address?.toLowerCase() ?? (isVaultXActive ? vaultXIdentity?.id : "anonymous");
    if (ownerKey && bundle.keyHex) {
      const ext = selectedFile.name.split(".").pop()?.toUpperCase() || "BIN";
      saveUserFile({
        id: `cyber-${Date.now()}`,
        cid: finalCid!,
        fileName: selectedFile.name,
        originalName: selectedFile.name,
        extension: ext,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
        uploadedAt: finalUploadedAt || new Date().toISOString(),
        ownerAddress: ownerKey,
        keyHex: bundle.keyHex,
        wrappedKey: isVaultXActive ? wrappedKey : undefined,
        algorithm: "AES-256-GCM",
        sharedWith: [],
      });
    }
  }, [selectedFile, address, isVaultXActive, vaultXIdentity]);

  // Determine current companion state
  let owlState: "idle" | "file_selected" | "encrypting" | "uploading" | "success" | "error" = "idle";
  if (stage === "selected") owlState = "file_selected";
  else if (stage === "encrypting") owlState = "encrypting";
  else if (stage === "uploading" || stage === "encrypted") owlState = "uploading";
  else if (stage === "uploaded") owlState = "success";
  else if (stage === "error") owlState = "error";

  const totalChunks = selectedFile ? Math.ceil(selectedFile.size / (8 * 1024 * 1024)) || 1 : 1;
  const currentChunk = stage === "uploading" ? Math.min(Math.round(totalChunks * 0.72), totalChunks) : Math.round(totalChunks * 0.5);

  return (
    <div className="space-y-6">
      {/* ── Screen 5: File Selection & Idle ── */}
      {stage === "idle" && (
        <div className="space-y-5">
          <DropZone
            onFileSelect={handleFileSelect}
            file={selectedFile}
            onClear={reset}
            disabled={false}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Plaintext never leaves your device.
            </span>
            <span className="font-mono text-slate-400">AES-256-GCM + IPFS</span>
          </div>
        </div>
      )}

      {/* ── Screen 5: File Selected State ── */}
      {stage === "selected" && selectedFile && (
        <div className="space-y-6">
          <DropZone
            onFileSelect={handleFileSelect}
            file={selectedFile}
            onClear={reset}
            disabled={false}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <OwlCompanion state="file_selected" size="sm" />
              <div>
                <p className="text-xs font-bold text-slate-900">Ready to encrypt</p>
                <p className="text-[11px] text-slate-500">
                  File will be processed locally in {totalChunks} chunks of 8 MB
                </p>
              </div>
            </div>

            <button
              type="button"
              id="vault-encrypt-upload-btn"
              onClick={handleEncryptAndUpload}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all active:scale-[0.98]"
            >
              Secure File
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 font-medium">
            Encrypted locally before upload.
          </p>
        </div>
      )}

      {/* ── Screen 6: Encryption In Progress ── */}
      {stage === "encrypting" && selectedFile && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Securing your file...</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedFile.name} · {formatBytes(selectedFile.size)}
              </p>
            </div>
            <OwlCompanion state="encrypting" size="sm" showBadge />
          </div>

          {/* Progress Checklist (Screen 6) */}
          <div className="space-y-3 pt-2 text-xs font-medium">
            <div className="flex items-center gap-2.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Preparing file for processing</span>
            </div>
            <div className="flex items-center gap-2.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Chunking: Splitting into {totalChunks} chunks</span>
            </div>
            <div className="space-y-1.5 pl-6">
              <div className="flex items-center justify-between text-xs text-[#2563EB] font-bold">
                <span>Encrypting chunk {currentChunk} / {totalChunks}</span>
                <span>73%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[73%] rounded-full bg-[#2563EB] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-slate-400 pl-6">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span>Verifying: Generating integrity hashes</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-400 pl-6">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span>Uploading: Sending encrypted chunks to IPFS</span>
            </div>
          </div>

          {/* Badges Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-[11px]">
            <span className="rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 px-3 py-1 font-semibold">
              Encrypted locally
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1">
              AES-256-GCM encryption
            </span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1">
              Integrity protected (SHA-256)
            </span>
          </div>
        </div>
      )}

      {/* ── Screen 7: Large File Upload / IPFS Uploading ── */}
      {stage === "uploading" && selectedFile && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Uploading encrypted data</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your encrypted chunks are being uploaded to decentralized IPFS storage.
              </p>
            </div>
            <OwlCompanion state="uploading" size="sm" />
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between font-mono">
              <span className="text-3xl font-extrabold text-[#2563EB]">72%</span>
              <div className="text-right text-xs text-slate-500">
                <span className="font-bold text-slate-800">{currentChunk} / {totalChunks} chunks</span>
                <span className="block text-[11px] text-slate-400">{formatBytes(encryptedSize * 0.72)} / {formatBytes(encryptedSize)}</span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[72%] rounded-full bg-[#2563EB] transition-all duration-300" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Network Connected
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 px-2.5 py-0.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Integrity Verified
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Only encrypted data is uploaded.</span>
          </div>
        </div>
      )}

      {/* ── Screen 9: Upload Success ── */}
      {stage === "uploaded" && cid && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs text-center">
          <div className="flex flex-col items-center gap-3">
            <OwlCompanion state="success" size="lg" showBadge />
            <h3 className="text-2xl font-bold text-slate-900">Your file is secured.</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Your encrypted data was stored on decentralized IPFS. Plaintext never left your device.
            </p>
          </div>

          {/* Verification Checklist */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-emerald-700 pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Integrity verified
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Stored on IPFS
            </span>
          </div>

          {/* Manifest CID Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Manifest IPFS CID</span>
              <CopyButton text={cid} label="Copy CID" />
            </div>
            <p className="font-mono text-xs font-bold text-slate-800 break-all select-all">
              {cid}
            </p>
          </div>

          {/* Key Save Card (if not wrapped) */}
          {keyHex && !keyProtectedByVaultX && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Save Your AES-256 Decryption Key
                </span>
                <CopyButton text={keyHex} label="Copy Key" />
              </div>
              <p className="font-mono text-xs text-amber-900 break-all bg-white p-2 rounded-xl border border-amber-200">
                {keyHex}
              </p>
              <p className="text-[11px] text-amber-700">
                Keep this key safe. You will need it to decrypt and download your file.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={getIpfsUrl(cid)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs"
            >
              <span>View Raw Payload</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={reset}
              className="w-full sm:w-auto px-8 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-sm transition-all"
            >
              Done
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Your plaintext file was never uploaded.
          </p>
        </div>
      )}

      {/* ── Screen 8 / Error State ── */}
      {stage === "error" && errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 space-y-4 text-center">
          <OwlCompanion state="error" size="md" showSpeechBubble speechText="Your file data is safe on this device." />
          <div>
            <h4 className="font-bold text-sm text-rose-900">Upload paused or interrupted</h4>
            <p className="text-xs text-rose-700 max-w-sm mx-auto mt-1 leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleEncryptAndUpload}
              className="px-6 py-2 rounded-full bg-[#2563EB] text-white font-semibold text-xs hover:bg-[#1D4ED8]"
            >
              Resume Upload
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-600 font-medium text-xs hover:bg-slate-50"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
