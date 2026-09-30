"use client";

/**
 * CYBER-10 Phase 3 — FileEncryptionPanel
 *
 * A rich, dual-mode (Encrypt / Decrypt) file encryption UI that uses the
 * client-side AES-256-GCM engine from src/lib/crypto.ts.
 *
 * All cryptographic operations happen locally — no data leaves the browser.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Lock,
  Unlock,
  Upload,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Key,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { encryptFile, decryptFile, downloadBlob, formatBytes, type EncryptedFileBundle, type CryptoProgress } from "@/lib/crypto";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "encrypt" | "decrypt";

interface OperationState {
  status: "idle" | "processing" | "success" | "error";
  progress: CryptoProgress | null;
  errorMessage: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-mono transition-all duration-200",
        copied
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DropZone({
  onFileSelect,
  accept,
  label,
  sublabel,
  file,
  onClear,
}: {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  sublabel: string;
  file: File | null;
  onClear: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  if (file) {
    return (
      <div className="relative flex items-center gap-3 rounded-xl border border-[#3B4046] bg-[#141618] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6851B]/15 border border-[#F6851B]/30">
          <FileText className="h-5 w-5 text-[#F6851B]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#F2F4F6]">{file.name}</p>
          <p className="text-xs text-[#848C96]">{formatBytes(file.size)} · {file.type || "binary payload"}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg p-1.5 text-[#848C96] hover:bg-[#24272A] hover:text-[#F2F4F6] transition-colors"
          title="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
        isDragging
          ? "border-[#F6851B] bg-[#F6851B]/10 scale-[1.01]"
          : "border-[#3B4046] hover:border-[#F6851B]/60 hover:bg-[#24272A]/50 bg-[#141618]/60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-label={label}
      />
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
        isDragging ? "border-[#F6851B]/60 bg-[#F6851B]/20" : "border-[#3B4046] bg-[#24272A]"
      )}>
        <Upload className={cn("h-5 w-5 transition-colors", isDragging ? "text-[#F6851B]" : "text-[#848C96]")} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#F2F4F6]">{label}</p>
        <p className="mt-0.5 text-xs text-[#848C96]">{sublabel}</p>
      </div>
    </div>
  );
}

function KeyDisplay({ keyHex }: { keyHex: string }) {
  const [visible, setVisible] = useState(false);

  const display = visible
    ? keyHex
    : keyHex.slice(0, 8) + "•".repeat(48) + keyHex.slice(-8);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Key className="h-3.5 w-3.5 text-[#F6851B]" />
          <span className="text-xs font-bold text-[#F6851B] uppercase tracking-wider">
            AES-256 Encryption Key
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#24272A] transition-colors"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {visible ? "Hide" : "Show"}
          </button>
          <CopyButton text={keyHex} className="bg-[#141618] border-[#3B4046] text-[#848C96] hover:text-white" />
        </div>
      </div>

      <div className="rounded-xl border border-[#3B4046] bg-[#141618] p-3">
        <p className="break-all font-mono text-xs text-[#F6851B] leading-relaxed">
          {display}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
        <p className="text-[11px] text-red-300 leading-relaxed">
          <strong>Save this key now.</strong> It is not stored anywhere on the server. Without this key, the encrypted file cannot be decrypted.
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ stage, message }: { stage: string; message: string }) {
  const isIndeterminate = stage !== "done" && stage !== "error";
  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#141618]">
        {isIndeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-[#F6851B] animate-[shimmer_1.2s_ease-in-out_infinite]" />
        ) : (
          <div className={cn("h-full w-full rounded-full transition-all", stage === "done" ? "bg-emerald-500" : "bg-red-500")} />
        )}
      </div>
      <p className="text-xs text-[#848C96] font-mono">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Encrypt Panel
// ─────────────────────────────────────────────────────────────────────────────

function EncryptPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [opState, setOpState] = useState<OperationState>({ status: "idle", progress: null, errorMessage: null });
  const [bundle, setBundle] = useState<EncryptedFileBundle | null>(null);

  const handleEncrypt = async () => {
    if (!file) return;
    setBundle(null);
    setOpState({ status: "processing", progress: null, errorMessage: null });

    try {
      const result = await encryptFile(file, (p) => {
        setOpState({ status: "processing", progress: p, errorMessage: null });
      });
      setBundle(result);
      setOpState({ status: "success", progress: { stage: "done", message: "Encryption complete." }, errorMessage: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Encryption failed.";
      setOpState({ status: "error", progress: { stage: "error", message: msg }, errorMessage: msg });
    }
  };

  const reset = () => {
    setFile(null);
    setBundle(null);
    setOpState({ status: "idle", progress: null, errorMessage: null });
  };

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#037DD6]/30 bg-[#141618] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#037DD6]" />
        <div className="text-xs text-[#848C96] leading-relaxed">
          <span className="text-[#037DD6] font-semibold">Zero-knowledge sovereign encryption.</span>{" "}
          Your file is read into local browser memory and encrypted with AES-256-GCM.
          No data is uploaded to any server. The cryptographic key is generated on your device.
        </div>
      </div>

      {/* File Drop Zone */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#848C96]">
          1. Select File to Encrypt
        </label>
        <DropZone
          onFileSelect={setFile}
          label="Drop any file here, or click to browse"
          sublabel="Any file type supported · Client-side authenticated encryption"
          file={file}
          onClear={reset}
        />
      </div>

      {/* Encrypt Button */}
      {file && opState.status !== "success" && (
        <button
          type="button"
          onClick={handleEncrypt}
          disabled={opState.status === "processing"}
          id="encrypt-file-btn"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-200",
            opState.status === "processing"
              ? "bg-[#24272A] text-[#848C96] cursor-not-allowed border border-[#3B4046]"
              : "bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md active:scale-[0.98]"
          )}
        >
          {opState.status === "processing" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {opState.status === "processing" ? "Encrypting with AES-256…" : "Encrypt File"}
        </button>
      )}

      {/* Progress */}
      {opState.progress && opState.status === "processing" && (
        <ProgressBar stage={opState.progress.stage} message={opState.progress.message} />
      )}

      {/* Error */}
      {opState.status === "error" && opState.errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{opState.errorMessage}</p>
        </div>
      )}

      {/* Success Result */}
      {opState.status === "success" && bundle && (
        <div className="space-y-4 rounded-2xl border border-[#3B4046] bg-[#24272A] p-5 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white">File Encrypted Successfully</span>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Algorithm", value: "AES-256-GCM" },
              { label: "Auth Tag", value: "128-bit GCM" },
              { label: "Original Size", value: formatBytes(bundle.originalSizeBytes) },
              { label: "Encrypted Size", value: formatBytes(bundle.encryptedSizeBytes) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-[#3B4046] bg-[#141618] px-3.5 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#848C96]">{label}</p>
                <p className="mt-0.5 font-mono text-sm text-[#F2F4F6] font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Key Display */}
          <KeyDisplay keyHex={bundle.keyHex} />

          {/* Download & Vault Upload Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => downloadBlob(bundle.encryptedBlob, bundle.downloadName)}
              id="download-encrypted-btn"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#3B4046] bg-[#141618] py-2.5 text-xs font-semibold text-[#F2F4F6] hover:bg-[#2B2F34] transition-all"
            >
              <Download className="h-4 w-4 text-[#F6851B]" />
              Download Encrypted File
            </button>
            <a
              href="/dashboard/vault"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] py-2.5 text-xs font-bold text-white shadow-sm transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload to IPFS Vault →
            </a>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#3B4046] bg-[#141618] px-4 py-2.5 text-xs font-medium text-[#848C96] hover:bg-[#2B2F34] hover:text-[#F2F4F6] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decrypt Panel
// ─────────────────────────────────────────────────────────────────────────────

function DecryptPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [opState, setOpState] = useState<OperationState>({ status: "idle", progress: null, errorMessage: null });
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleDecrypt = async () => {
    if (!file || !keyInput.trim()) return;
    setResult(null);
    setOpState({ status: "processing", progress: null, errorMessage: null });

    try {
      const decrypted = await decryptFile(file, keyInput.trim(), (p) => {
        setOpState({ status: "processing", progress: p, errorMessage: null });
      });
      setResult({ blob: decrypted.plainBlob, name: decrypted.originalName });
      setOpState({ status: "success", progress: { stage: "done", message: "Decryption complete. Downloading file..." }, errorMessage: null });
      downloadBlob(decrypted.plainBlob, decrypted.originalName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decryption failed.";
      setOpState({ status: "error", progress: { stage: "error", message: msg }, errorMessage: msg });
    }
  };

  const reset = () => {
    setFile(null);
    setKeyInput("");
    setResult(null);
    setOpState({ status: "idle", progress: null, errorMessage: null });
  };

  const canDecrypt = file && keyInput.trim().length === 64;

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#037DD6]/30 bg-[#141618] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#037DD6]" />
        <div className="text-xs text-[#848C96] leading-relaxed">
          <span className="text-[#037DD6] font-semibold">Authenticated decryption.</span>{" "}
          The GCM auth tag is verified before any data is returned — if the file has been tampered
          with or the key is incorrect, client-side decryption will fail.
        </div>
      </div>

      {/* File Drop */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#848C96]">
          1. Select Encrypted File (.cyber10enc)
        </label>
        <DropZone
          onFileSelect={setFile}
          accept=".cyber10enc"
          label="Drop a .cyber10enc file here, or click to browse"
          sublabel="Only authenticated encrypted bundles are accepted"
          file={file}
          onClear={reset}
        />
      </div>

      {/* Key Input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#848C96]">
            2. Paste Your AES-256 Key
          </label>
          <span className={cn(
            "text-[11px] font-mono",
            keyInput.length === 64 ? "text-emerald-400" : keyInput.length > 0 ? "text-[#F6851B]" : "text-[#848C96]"
          )}>
            {keyInput.length}/64 hex chars
          </span>
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste 64-character hex key..."
            spellCheck={false}
            autoComplete="off"
            id="decrypt-key-input"
            className={cn(
              "w-full rounded-xl border bg-[#141618] px-4 py-3 pr-12 font-mono text-xs text-[#F2F4F6] placeholder:text-[#848C96] focus:outline-none transition-colors",
              keyInput.length === 64
                ? "border-emerald-500/60 focus:border-emerald-400"
                : keyInput.length > 0
                ? "border-[#F6851B]/60 focus:border-[#F6851B]"
                : "border-[#3B4046] focus:border-[#F6851B]"
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848C96] hover:text-[#F2F4F6] transition-colors"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* File required helper text */}
      {!file && keyInput.trim().length === 64 && (
        <div className="flex items-center justify-between rounded-xl border border-[#F6851B]/30 bg-[#F6851B]/10 px-3.5 py-2.5 text-xs text-[#F6851B]">
          <span>⚠️ <strong>Step 1 required:</strong> Click or drop your <code>.cyber10enc</code> file into box #1 above.</span>
          <a
            href="/dashboard/vault"
            className="ml-3 shrink-0 underline text-white hover:text-[#F6851B] font-semibold"
          >
            Or decrypt from IPFS Vault →
          </a>
        </div>
      )}

      {/* Decrypt Button */}
      {opState.status !== "success" && (
        <button
          type="button"
          onClick={handleDecrypt}
          disabled={!canDecrypt || opState.status === "processing"}
          id="decrypt-file-btn"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-200",
            !canDecrypt || opState.status === "processing"
              ? "bg-[#24272A] text-[#848C96] cursor-not-allowed border border-[#3B4046]"
              : "bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md active:scale-[0.98]"
          )}
        >
          {opState.status === "processing" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          {opState.status === "processing"
            ? "Decrypting Payload…"
            : !file
            ? "Select a .cyber10enc file to decrypt"
            : keyInput.trim().length !== 64
            ? "Enter 64-character hex key"
            : "Decrypt File"}
        </button>
      )}

      {/* Progress */}
      {opState.progress && opState.status === "processing" && (
        <ProgressBar stage={opState.progress.stage} message={opState.progress.message} />
      )}

      {/* Error */}
      {opState.status === "error" && opState.errorMessage && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{opState.errorMessage}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-[#848C96] hover:text-[#F2F4F6] underline transition-colors">
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {opState.status === "success" && result && (
        <div className="space-y-4 rounded-2xl border border-[#3B4046] bg-[#24272A] p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white">Integrity Verified — File Decrypted</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#3B4046] bg-[#141618] px-3.5 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-[#F6851B]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#F2F4F6]">{result.name}</p>
              <p className="text-xs text-[#848C96]">{formatBytes(result.blob.size)}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, result.name)}
              id="download-decrypted-btn"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] py-2.5 text-xs font-bold text-white shadow-sm transition-all"
            >
              <Download className="h-4 w-4" />
              Download Original File
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#3B4046] bg-[#141618] px-4 py-2.5 text-xs font-medium text-[#848C96] hover:bg-[#2B2F34] hover:text-[#F2F4F6] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Decrypt Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component (MetaMask Aesthetic)
// ─────────────────────────────────────────────────────────────────────────────

export function FileEncryptionPanel() {
  const [mode, setMode] = useState<Mode>("encrypt");

  return (
    <div className="panel-max-w w-full max-w-2xl mx-auto">
      {/* Mode Toggle */}
      <div className="mb-6 flex rounded-2xl border border-[#3B4046] bg-[#141618] p-1.5 shadow-md">
        {(["encrypt", "decrypt"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            id={`mode-${m}-btn`}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200",
              mode === m
                ? "bg-[#24272A] text-white border border-[#3B4046] shadow-sm"
                : "text-[#848C96] hover:text-[#F2F4F6]"
            )}
          >
            {m === "encrypt" ? <Lock className="h-4 w-4 text-[#F6851B]" /> : <Unlock className="h-4 w-4 text-[#037DD6]" />}
            {m === "encrypt" ? "Encrypt File" : "Decrypt File"}
          </button>
        ))}
      </div>

      {/* Panel Content — both panels always mounted to preserve state on tab switch */}
      <div className="rounded-2xl border border-[#3B4046] bg-[#1E2024] shadow-2xl p-6 sm:p-8">
        <div className={mode === "encrypt" ? "block" : "hidden"}>
          <EncryptPanel />
        </div>
        <div className={mode === "decrypt" ? "block" : "hidden"}>
          <DecryptPanel />
        </div>
      </div>
    </div>
  );
}
