"use client";

/**
 * SecureVault — FileEncryptionPanel
 *
 * A rich, dual-mode (Encrypt / Decrypt) file encryption UI that uses the
 * client-side AES-256-GCM engine from src/lib/crypto.ts.
 *
 * All cryptographic operations happen locally in browser WebCrypto — no plaintext leaves your device.
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
import { OwlCompanion } from "@/components/ui/OwlCompanion";

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
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200",
        copied
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
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
    e.target.value = "";
  };

  if (file) {
    return (
      <div className="relative flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{formatBytes(file.size)} · {file.type || "binary payload"}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
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
          ? "border-[#2563EB] bg-blue-50/60 scale-[1.01]"
          : "border-slate-300 hover:border-[#2563EB]/70 hover:bg-blue-50/30 bg-slate-50/50"
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
        isDragging ? "border-blue-200 bg-blue-100 text-[#2563EB]" : "border-slate-200 bg-white text-slate-500 shadow-2xs"
      )}>
        <Upload className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Key className="h-3.5 w-3.5 text-[#2563EB]" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            AES-256 Encryption Key
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {visible ? "Hide" : "Show"}
          </button>
          <CopyButton text={keyHex} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="break-all font-mono text-xs text-slate-800 leading-relaxed">
          {display}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
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
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {isIndeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-[shimmer_1.2s_ease-in-out_infinite]" />
        ) : (
          <div className={cn("h-full w-full rounded-full transition-all", stage === "done" ? "bg-emerald-500" : "bg-red-500")} />
        )}
      </div>
      <p className="text-xs text-slate-600 font-mono">{message}</p>
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
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="text-[#2563EB] font-bold">Encrypted locally.</span>{" "}
          Your file is read into local browser memory and encrypted with AES-256-GCM.
          No plaintext data is uploaded to any server. The cryptographic key is generated on your device.
        </div>
      </div>

      {/* Owl Companion Assistant Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 flex items-center gap-4">
        <OwlCompanion
          state={
            opState.status === "processing"
              ? "encrypting"
              : opState.status === "success"
              ? "success"
              : file
              ? "file_selected"
              : "idle"
          }
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900">
            {opState.status === "processing"
              ? "Protecting File Locally"
              : opState.status === "success"
              ? "File Secured with AES-256"
              : file
              ? "File Loaded & Ready"
              : "Guardian Ready"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {opState.status === "processing"
              ? "Encrypting locally in your browser memory before any network interaction."
              : opState.status === "success"
              ? "Your encrypted bundle is prepared with a 256-bit symmetric key."
              : file
              ? "Click 'Secure File' to run client-side authenticated encryption."
              : "Drop your file below. Plaintext never leaves your computer."}
          </p>
        </div>
      </div>

      {/* File Drop Zone */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
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
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs active:scale-[0.99]"
          )}
        >
          {opState.status === "processing" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {opState.status === "processing" ? "Encrypting with AES-256…" : "Secure File (Encrypt Locally)"}
        </button>
      )}

      {/* Progress */}
      {opState.progress && opState.status === "processing" && (
        <ProgressBar stage={opState.progress.stage} message={opState.progress.message} />
      )}

      {/* Error */}
      {opState.status === "error" && opState.errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{opState.errorMessage}</p>
        </div>
      )}

      {/* Success Result */}
      {opState.status === "success" && bundle && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900">File Encrypted Successfully</span>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Algorithm", value: "AES-256-GCM" },
              { label: "Auth Tag", value: "128-bit GCM" },
              { label: "Original Size", value: formatBytes(bundle.originalSizeBytes) },
              { label: "Encrypted Size", value: formatBytes(bundle.encryptedSizeBytes) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-900 font-bold">{value}</p>
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
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-all"
            >
              <Download className="h-4 w-4 text-[#2563EB]" />
              Download Encrypted File
            </button>
            <a
              href="/dashboard/vault"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] py-2.5 text-xs font-bold text-white shadow-xs transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload to IPFS Vault →
            </a>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="text-[#2563EB] font-bold">Authenticated decryption.</span>{" "}
          The GCM auth tag is verified before any data is returned — if the file has been tampered
          with or the key is incorrect, client-side decryption will fail.
        </div>
      </div>

      {/* Owl Decryption Companion Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 flex items-center gap-4">
        <OwlCompanion
          state={
            opState.status === "processing"
              ? "decrypting"
              : opState.status === "success"
              ? "success"
              : "idle"
          }
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900">
            {opState.status === "processing"
              ? "Verifying Integrity & Decrypting"
              : opState.status === "success"
              ? "File Ready"
              : "Local Decryption Guardian"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {opState.status === "processing"
              ? "Validating 128-bit authentication tag and decrypting ciphertext locally."
              : opState.status === "success"
              ? "Original file reconstructed and downloaded to your computer."
              : "Provide your .cyber10enc file and 64-character hex key below."}
          </p>
        </div>
      </div>

      {/* File Drop */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
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
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            2. Paste Your AES-256 Key
          </label>
          <span className={cn(
            "text-[11px] font-mono",
            keyInput.length === 64 ? "text-emerald-600 font-bold" : keyInput.length > 0 ? "text-blue-600" : "text-slate-400"
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
              "w-full rounded-xl border bg-white px-4 py-3 pr-12 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors",
              keyInput.length === 64
                ? "border-emerald-500 focus:border-emerald-600"
                : keyInput.length > 0
                ? "border-blue-400 focus:border-[#2563EB]"
                : "border-slate-200 focus:border-[#2563EB]"
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* File required helper text */}
      {!file && keyInput.trim().length === 64 && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
          <span>⚠️ <strong>Step 1 required:</strong> Click or drop your <code>.cyber10enc</code> file into box #1 above.</span>
          <a
            href="/dashboard/vault"
            className="ml-3 shrink-0 underline text-[#2563EB] hover:text-[#1D4ED8] font-bold"
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
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs active:scale-[0.99]"
          )}
        >
          {opState.status === "processing" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          {opState.status === "processing"
            ? "Decrypting Payload Locally…"
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
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{opState.errorMessage}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors">
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {opState.status === "success" && result && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900">Integrity Verified — File Decrypted</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-[#2563EB]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{result.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{formatBytes(result.blob.size)}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, result.name)}
              id="download-decrypted-btn"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] py-2.5 text-xs font-bold text-white shadow-xs transition-all"
            >
              <Download className="h-4 w-4" />
              Download Original File
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
// Main exported component (SecureVault Clean Aesthetic)
// ─────────────────────────────────────────────────────────────────────────────

export function FileEncryptionPanel() {
  const [mode, setMode] = useState<Mode>("encrypt");

  return (
    <div className="panel-max-w w-full max-w-2xl mx-auto">
      {/* Mode Toggle */}
      <div className="mb-6 flex rounded-2xl border border-slate-200 bg-slate-100 p-1.5 shadow-2xs">
        {(["encrypt", "decrypt"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            id={`mode-${m}-btn`}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200",
              mode === m
                ? "bg-white text-slate-900 border border-slate-200/90 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {m === "encrypt" ? <Lock className="h-4 w-4 text-[#2563EB]" /> : <Unlock className="h-4 w-4 text-[#2563EB]" />}
            {m === "encrypt" ? "Encrypt File" : "Decrypt File"}
          </button>
        ))}
      </div>

      {/* Panel Content — both panels always mounted to preserve state on tab switch */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-6 sm:p-8">
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
