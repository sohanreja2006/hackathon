"use client";

/**
 * CYBER-10 Phase 4 — VaultUploadPanel
 *
 * Full encrypt-then-upload flow:
 *   Select File → Encrypting → Encrypted → Uploading → Uploaded to IPFS → CID
 *
 * SECURITY:
 * - The plaintext file is read and encrypted locally via the Phase 3 crypto engine.
 * - ONLY the encrypted blob (.cyber10enc) is sent to the server.
 * - The AES key is either protected by VaultX KEK (preferred) or shown once to the user.
 * - The server never receives plaintext.
 */

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
} from "lucide-react";
import { encryptFile, formatBytes, type CryptoProgress } from "@/lib/crypto";
import { getIpfsUrl } from "@/lib/ipfs/gateway";
import { cn } from "@/lib/utils";
import type { VaultUploadStage, UploadApiResponse } from "@/types/files";
import { useAccount } from "wagmi";
import { saveUserFile } from "@/lib/fileStorage";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { protectFileKeyWithVaultX } from "@/lib/vaultxWallet";

// ─────────────────────────────────────────────────────────────────────────────
// Stage metadata
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<
  VaultUploadStage,
  { label: string; color: string; icon: React.ElementType }
> = {
  idle: { label: "IDLE", color: "text-zinc-500", icon: Upload },
  selected: { label: "SELECTED", color: "text-cyan-400", icon: FileText },
  encrypting: { label: "ENCRYPTING", color: "text-violet-400", icon: Lock },
  encrypted: { label: "ENCRYPTED", color: "text-emerald-400", icon: Lock },
  uploading: { label: "UPLOADING", color: "text-amber-400", icon: CloudUpload },
  uploaded: { label: "UPLOADED", color: "text-emerald-400", icon: CheckCircle2 },
  error: { label: "ERROR", color: "text-red-400", icon: AlertTriangle },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StageIndicator({ stage }: { stage: VaultUploadStage }) {
  const stages: VaultUploadStage[] = [
    "selected",
    "encrypting",
    "encrypted",
    "uploading",
    "uploaded",
  ];
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((s, i) => {
        const conf = STAGE_CONFIG[s];
        const isComplete = currentIndex > i;
        const isCurrent = currentIndex === i;
        const isError = stage === "error";

        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-medium border transition-all",
                  isError && isCurrent
                    ? "border-red-500/40 bg-red-950/30 text-red-400"
                    : isComplete
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : isCurrent
                    ? `border-current ${conf.color} bg-zinc-900`
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-600"
                )}
              >
                {isComplete ? (
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  isCurrent && !isError && (
                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  )
                )}
                {s.toUpperCase()}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "h-px w-3 transition-colors",
                  isComplete ? "bg-emerald-500/50" : "bg-zinc-800"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

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
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-mono transition-all duration-200",
        copied
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
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
    return (
      <div className="relative flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <FileText className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="text-xs text-zinc-500">
            {formatBytes(file.size)} · {file.type || "unknown type"}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
        disabled
          ? "border-zinc-800 opacity-50 cursor-not-allowed"
          : isDragging
          ? "border-cyan-400 bg-cyan-950/30 scale-[1.01] cursor-copy"
          : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50 cursor-pointer"
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
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border transition-all",
        isDragging ? "border-cyan-500/60 bg-cyan-500/10" : "border-zinc-700 bg-zinc-900"
      )}>
        <Upload className={cn("h-5 w-5 transition-colors", isDragging ? "text-cyan-400" : "text-zinc-500")} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">Drop any file here, or click to browse</p>
        <p className="mt-0.5 text-xs text-zinc-500">Max 500 MB · Any type · Will be encrypted before upload</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VaultX-protected key badge (key is wrapped — no plaintext shown by default)
// ─────────────────────────────────────────────────────────────────────────────

function VaultXKeyBadge({ vaultId, keyHex }: { vaultId: string; keyHex: string }) {
  const [showFallback, setShowFallback] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
          Key Protected by VaultX
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-xs text-emerald-300">{vaultId}</span>
        <span className="ml-auto text-[10px] text-emerald-600 uppercase tracking-wider">Active KEK</span>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Your file-encryption key has been wrapped by your VaultX master key and saved locally.{" "}
        <strong className="text-zinc-400">No manual key copy needed</strong> — VaultX will unlock it
        automatically when you retrieve this file.
      </p>

      <button
        type="button"
        onClick={() => setShowFallback((v) => !v)}
        className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 underline transition-colors"
      >
        {showFallback ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {showFallback ? "Hide" : "Show"} raw backup key
      </button>

      {showFallback && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                Raw AES-256 Backup Key
              </span>
            </div>
            <CopyButton text={keyHex} label="Copy Key" />
          </div>
          <p className="break-all font-mono text-[10px] text-amber-200 leading-relaxed bg-amber-950/30 rounded-lg border border-amber-500/20 p-2">
            {keyHex}
          </p>
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
            <p className="text-[10px] text-red-300 leading-relaxed">
              Store this only if you plan to access this file without VaultX on a different device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Key display — shown once after encrypt when VaultX is NOT active
// ─────────────────────────────────────────────────────────────────────────────

function KeySaveBox({ keyHex }: { keyHex: string }) {
  const [visible, setVisible] = useState(false);
  const display = visible ? keyHex : keyHex.slice(0, 8) + "•".repeat(48) + keyHex.slice(-8);

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Key className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            AES-256 Encryption Key — Save Now
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {visible ? "Hide" : "Reveal"}
          </button>
          <CopyButton text={keyHex} label="Copy Key" />
        </div>
      </div>

      <p className="break-all font-mono text-xs text-amber-200 leading-relaxed bg-amber-950/30 rounded-lg border border-amber-500/20 p-2.5">
        {display}
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
        <p className="text-[11px] text-red-300 leading-relaxed">
          <strong>This key is shown exactly once.</strong> CYBER-10 does not store it.
          Without this key, your file cannot be decrypted — not even from IPFS.{" "}
          <span className="text-amber-300 font-medium">
            Connect VaultX Secure Wallet to manage keys automatically.
          </span>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CID Result display
// ─────────────────────────────────────────────────────────────────────────────

function CidDisplay({ cid, uploadedAt, size }: { cid: string; uploadedAt: string; size: number }) {
  const ipfsUrl = getIpfsUrl(cid);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-4">
      {/* Success header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span className="font-semibold text-emerald-300">Uploaded to IPFS</span>
      </div>

      {/* CID */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            IPFS Content Identifier (CID)
          </span>
          <CopyButton text={cid} label="Copy CID" />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
          <p className="break-all font-mono text-xs text-cyan-300 leading-relaxed">{cid}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Encrypted Size", value: formatBytes(size) },
          { label: "Uploaded At", value: new Date(uploadedAt).toLocaleString() },
          { label: "Storage", value: "IPFS via Pinata" },
          { label: "Content", value: "AES-256-GCM Ciphertext" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
            <p className="mt-0.5 text-xs text-zinc-200 font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* IPFS link */}
      <a
        href={ipfsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        View on IPFS Gateway
        <ExternalLink className="h-3 w-3" />
      </a>

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          The content on IPFS is pure ciphertext. It cannot be read without your AES-256 key.
          Use the <strong className="text-zinc-400">Retrieve tab</strong> to download and decrypt.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function VaultUploadPanel() {
  const { address, isConnected } = useAccount();
  const { isConnected: isVaultXConnected, identity: vaultXIdentity } = useVaultXWallet();

  // If MetaMask is connected, MetaMask is active and we do NOT use VaultX
  const isMetaMaskActive = Boolean(address && isConnected);
  const isVaultXActive = !isMetaMaskActive && isVaultXConnected;

  const [stage, setStage] = useState<VaultUploadStage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keyHex, setKeyHex] = useState<string | null>(null);
  const [keyProtectedByVaultX, setKeyProtectedByVaultX] = useState(false);
  const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null);
  const [encryptedSize, setEncryptedSize] = useState<number>(0);
  const [cid, setCid] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string>("");
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cryptoProgress, setCryptoProgress] = useState<CryptoProgress | null>(null);

  const isProcessing = stage === "encrypting" || stage === "uploading";

  const reset = useCallback(() => {
    setStage("idle");
    setSelectedFile(null);
    setKeyHex(null);
    setKeyProtectedByVaultX(false);
    setEncryptedBlob(null);
    setEncryptedSize(0);
    setCid(null);
    setUploadedAt("");
    setUploadedSize(0);
    setStatusMessage("");
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

    // ── Phase 1: Encrypt locally ─────────────────────────────────────────────
    setStage("encrypting");
    setErrorMessage(null);
    setStatusMessage("Encrypting in browser...");

    let bundle;
    try {
      bundle = await encryptFile(selectedFile, (p) => {
        setCryptoProgress(p);
        setStatusMessage(p.message);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Encryption failed.";
      setErrorMessage(msg);
      setStage("error");
      return;
    }

    // ── Phase 1b: Wrap DEK with VaultX KEK ONLY if VaultX is active (NOT when MetaMask is connected) ──
    let wrappedKey: string | undefined;
    if (isVaultXActive) {
      try {
        wrappedKey = await protectFileKeyWithVaultX(bundle.keyHex);
        setKeyProtectedByVaultX(true);
      } catch (wrapErr) {
        console.warn("VaultX key wrapping failed, falling back to raw key display", wrapErr);
        setKeyProtectedByVaultX(false);
      }
    } else {
      setKeyProtectedByVaultX(false);
    }

    setKeyHex(bundle.keyHex);
    setEncryptedBlob(bundle.encryptedBlob);
    setEncryptedSize(bundle.encryptedSizeBytes);
    setStage("encrypted");
    setStatusMessage("Encrypted. Uploading ciphertext to IPFS...");

    // Brief pause so the user sees the "ENCRYPTED" state
    await new Promise((r) => setTimeout(r, 600));

    // ── Phase 2: Direct-to-Pinata upload using signed URL (supports up to 500 MB) ──
    setStage("uploading");
    setStatusMessage("Obtaining secure upload authorization...");

    let finalCid: string | null = null;
    let finalSize: number = bundle.encryptedSizeBytes;
    let finalUploadedAt: string = new Date().toISOString();

    try {
      // 1. Request presigned upload URL from our Next.js backend (minimal metadata, < 1 KB)
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
        const errJson = await urlRes.json().catch(() => null);
        throw new Error(errJson?.error || "Could not acquire direct upload credentials.");
      }

      const { uploadUrl } = await urlRes.json();
      if (!uploadUrl) {
        throw new Error("No upload URL returned.");
      }

      setStatusMessage("Uploading ciphertext directly to IPFS (bypassing server limits)...");

      // 2. Upload encrypted blob directly to Pinata edge
      const pinataForm = new FormData();
      pinataForm.append("file", bundle.encryptedBlob, bundle.downloadName);

      const pinataRes = await fetch(uploadUrl, {
        method: "POST",
        body: pinataForm,
      });

      if (!pinataRes.ok) {
        const errText = await pinataRes.text();
        throw new Error(`Direct upload failed (${pinataRes.status}): ${errText.slice(0, 100)}`);
      }

      const pinataData = await pinataRes.json();
      finalCid = pinataData?.data?.cid;
      finalSize = pinataData?.data?.size || bundle.encryptedSizeBytes;
      finalUploadedAt = pinataData?.data?.created_at || new Date().toISOString();

      if (!finalCid) {
        throw new Error("Pinata direct upload did not return a CID.");
      }
    } catch (directErr: unknown) {
      console.warn("Direct upload fallback to server proxy", directErr);
      setStatusMessage("Routing upload via secure server proxy...");

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
        setErrorMessage(`Upload failed. Could not reach the server: ${msg}`);
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

    // ── Success ──────────────────────────────────────────────────────────────
    setCid(finalCid);
    setUploadedAt(finalUploadedAt);
    setUploadedSize(finalSize);
    setStage("uploaded");
    setStatusMessage("Successfully uploaded to IPFS.");
    setCryptoProgress(null);

    // Auto-save to Decentralized File Directory (FR-4) — include wrappedKey only if VaultX is active
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
  }, [selectedFile, address, isConnected, isVaultXActive, vaultXIdentity]);

  return (
    <div className="space-y-5">
      {/* Stage indicator */}
      {stage !== "idle" && (
        <div className="space-y-1">
          <StageIndicator stage={stage === "error" ? "error" : stage} />
          {statusMessage && stage !== "uploaded" && stage !== "error" && (
            <p className="text-xs text-zinc-500 font-mono pl-0.5">{statusMessage}</p>
          )}
        </div>
      )}

      {/* Info banner */}
      {stage === "idle" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-cyan-300 font-medium">Zero-knowledge upload.</span>{" "}
            Files are encrypted in your browser with AES-256-GCM before upload.
            Only ciphertext reaches the server — your plaintext and key never leave your device.
            {isVaultXActive && (
              <span className="ml-1 inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3" /> VaultX will protect your key automatically.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <DropZone
        onFileSelect={handleFileSelect}
        file={selectedFile}
        onClear={reset}
        disabled={isProcessing || stage === "uploaded"}
      />

      {/* Crypto progress */}
      {cryptoProgress && stage === "encrypting" && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-[shimmer_1.2s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-zinc-400 font-mono">{cryptoProgress.message}</p>
        </div>
      )}

      {/* Upload spinner */}
      {stage === "uploading" && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-[shimmer_1.2s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Uploading {formatBytes(encryptedSize)} encrypted bundle to Pinata IPFS...
          </p>
        </div>
      )}

      {/* Key display — VaultX-protected badge ONLY if VaultX is active, otherwise standard KeySaveBox */}
      {keyHex && (stage === "encrypted" || stage === "uploading" || stage === "uploaded") && (
        isVaultXActive && keyProtectedByVaultX && vaultXIdentity ? (
          <VaultXKeyBadge vaultId={vaultXIdentity.id} keyHex={keyHex} />
        ) : (
          <KeySaveBox keyHex={keyHex} />
        )
      )}

      {/* Error */}
      {stage === "error" && errorMessage && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{errorMessage}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">
            Start over
          </button>
        </div>
      )}

      {/* CID display */}
      {stage === "uploaded" && cid && (
        <CidDisplay cid={cid} uploadedAt={uploadedAt} size={uploadedSize} />
      )}

      {/* Main action button */}
      {(stage === "selected" || stage === "encrypted") && (
        <button
          type="button"
          id="vault-encrypt-upload-btn"
          onClick={handleEncryptAndUpload}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 text-white hover:brightness-110 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" />
          Encrypt & Upload to IPFS
        </button>
      )}

      {/* Reset */}
      {stage === "uploaded" && (
        <button
          type="button"
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Upload Another File
        </button>
      )}
    </div>
  );
}
