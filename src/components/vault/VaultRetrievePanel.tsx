"use client";

/**
 * CYBER-10 Phase 4 — VaultRetrievePanel
 *
 * Retrieval and decryption flow:
 *   Enter CID → Fetch encrypted bytes from IPFS → Decrypt in browser → Download
 *
 * SECURITY:
 * - Encrypted bytes are fetched directly from a public IPFS gateway.
 * - Decryption happens entirely in the browser (Phase 3 crypto engine).
 * - The AES key is NEVER sent to the server.
 * - The server never decrypts anything.
 */

import React, { useState } from "react";
import {
  Download,
  Globe,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  FileText,
} from "lucide-react";
import { decryptFile, downloadBlob, formatBytes } from "@/lib/crypto";
import { fetchFromIpfs, getIpfsUrl, isValidCid, getGatewayBase } from "@/lib/ipfs/gateway";
import { cn } from "@/lib/utils";

type RetrieveStage = "idle" | "fetching" | "decrypting" | "done" | "error";

export function VaultRetrievePanel() {
  const [cidInput, setCidInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [stage, setStage] = useState<RetrieveStage>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string; size: number } | null>(null);

  const cidValid = isValidCid(cidInput.trim());
  const keyValid = keyInput.trim().length === 64;
  const canRetrieve = cidValid && keyValid && stage !== "fetching" && stage !== "decrypting";

  const reset = () => {
    setStage("idle");
    setStatusMessage("");
    setErrorMessage(null);
    setResult(null);
  };

  const handleRetrieveAndDecrypt = async () => {
    if (!cidValid || !keyValid) return;

    const cid = cidInput.trim();
    const key = keyInput.trim();

    setStage("fetching");
    setErrorMessage(null);
    setResult(null);
    setStatusMessage("Fetching encrypted data from IPFS...");

    // ── 1. Fetch encrypted bytes from IPFS gateway ──────────────────────────
    let rawBuffer: ArrayBuffer;
    try {
      rawBuffer = await fetchFromIpfs(cid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setErrorMessage(msg);
      setStage("error");
      return;
    }

    setStage("decrypting");
    setStatusMessage("Decrypting in browser...");

    // ── 2. Decrypt in the browser using the Phase 3 crypto engine ───────────
    // Wrap the raw buffer as a File so decryptFile() can read it
    const encryptedFile = new File([rawBuffer], `${cid}.cyber10enc`, {
      type: "application/octet-stream",
    });

    try {
      const decrypted = await decryptFile(encryptedFile, key, (p) => {
        setStatusMessage(p.message);
      });

      setResult({
        blob: decrypted.plainBlob,
        name: decrypted.originalName,
        size: decrypted.plainBlob.size,
      });
      setStage("done");
      setStatusMessage("Decryption complete. Downloading file...");

      // Automatically trigger browser file download
      downloadBlob(decrypted.plainBlob, decrypted.originalName);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Decryption failed.";
      setErrorMessage(msg);
      setStage("error");
    }
  };

  const isProcessing = stage === "fetching" || stage === "decrypting";

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="text-violet-300 font-medium">Browser-side decryption.</span>{" "}
          Encrypted bytes are fetched from IPFS and decrypted locally using your AES-256 key.
          The server never sees your key or the decrypted content.
        </div>
      </div>

      {/* CID input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-cid-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            1. IPFS CID
          </label>
          {cidInput.trim().length > 0 && (
            <span className={cn("text-[10px] font-mono", cidValid ? "text-emerald-400" : "text-red-400")}>
              {cidValid ? "✓ Valid CID" : "✗ Invalid format"}
            </span>
          )}
        </div>
        <input
          id="retrieve-cid-input"
          type="text"
          value={cidInput}
          onChange={(e) => { setCidInput(e.target.value); reset(); }}
          placeholder="bafybeig..."
          spellCheck={false}
          autoComplete="off"
          disabled={isProcessing}
          className={cn(
            "w-full rounded-xl border bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors",
            cidInput.trim().length === 0
              ? "border-zinc-700 focus:border-cyan-500"
              : cidValid
              ? "border-emerald-500/40 focus:border-emerald-400"
              : "border-red-500/40 focus:border-red-400"
          )}
        />
        {cidValid && (
          <a
            href={getIpfsUrl(cidInput.trim())}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <Globe className="h-2.5 w-2.5" />
            {getGatewayBase()}/ipfs/{cidInput.trim().slice(0, 20)}...
          </a>
        )}
      </div>

      {/* Key input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-key-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            2. AES-256 Decryption Key
          </label>
          <span className={cn(
            "text-[10px] font-mono",
            keyInput.length === 64 ? "text-emerald-400" : keyInput.length > 0 ? "text-amber-400" : "text-zinc-600"
          )}>
            {keyInput.length}/64
          </span>
        </div>
        <div className="relative">
          <input
            id="retrieve-key-input"
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); reset(); }}
            placeholder="Paste 64-character hex key..."
            spellCheck={false}
            autoComplete="off"
            disabled={isProcessing}
            className={cn(
              "w-full rounded-xl border bg-zinc-900 px-4 py-3 pr-12 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors",
              keyInput.length === 64
                ? "border-emerald-500/40 focus:border-emerald-400"
                : keyInput.length > 0
                ? "border-amber-500/40 focus:border-amber-400"
                : "border-zinc-700 focus:border-violet-500"
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={cn(
              "h-full w-1/3 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]",
              stage === "fetching"
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
            )} />
          </div>
          <p className="text-xs text-zinc-400 font-mono">{statusMessage}</p>
        </div>
      )}

      {/* Retrieve button */}
      {stage !== "done" && (
        <button
          type="button"
          id="vault-retrieve-btn"
          onClick={handleRetrieveAndDecrypt}
          disabled={!canRetrieve || isProcessing}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
            !canRetrieve || isProcessing
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          )}
        >
          {isProcessing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          {isProcessing
            ? stage === "fetching"
              ? "Fetching from IPFS..."
              : "Decrypting..."
            : "Retrieve & Decrypt"}
        </button>
      )}

      {/* Error */}
      {stage === "error" && errorMessage && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{errorMessage}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {stage === "done" && result && (
        <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-emerald-300">Integrity Verified — File Decrypted</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{result.name}</p>
              <p className="text-xs text-zinc-500">{formatBytes(result.size)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              id="vault-download-decrypted-btn"
              onClick={() => downloadBlob(result.blob, result.name)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-950/60 transition-all duration-200 hover:border-emerald-400"
            >
              <Download className="h-4 w-4" />
              Download Decrypted File
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retrieve Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
