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

import React, { useState, useEffect } from "react";
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
  ShieldCheck,
} from "lucide-react";
import { decryptFile, downloadBlob, formatBytes } from "@/lib/crypto";
import { fetchFromIpfs, getIpfsUrl, isValidCid, getGatewayBase } from "@/lib/ipfs/gateway";
import { cn } from "@/lib/utils";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { unlockFileKeyWithVaultX } from "@/lib/vaultxWallet";
import { getUserFiles } from "@/lib/fileStorage";
import { useAccount } from "wagmi";

type RetrieveStage = "idle" | "fetching" | "decrypting" | "done" | "error";

export function VaultRetrievePanel() {
  const { address } = useAccount();
  const { isConnected: isVaultXConnected, identity: vaultXIdentity } = useVaultXWallet();

  const [cidInput, setCidInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [stage, setStage] = useState<RetrieveStage>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string; size: number } | null>(null);
  const [savedVaultKey, setSavedVaultKey] = useState<string | null>(null);

  // When CID changes, check if there is a saved key available (NEVER auto-fill keyInput)
  useEffect(() => {
    setSavedVaultKey(null);
    const cid = cidInput.trim();
    if (!isValidCid(cid)) return;

    let cancelled = false;
    const ownerKey = address?.toLowerCase() ?? vaultXIdentity?.id ?? "";
    if (!ownerKey) return;

    const files = getUserFiles(ownerKey);
    const match = files.find((f) => f.cid === cid);

    if (match?.wrappedKey && isVaultXConnected) {
      unlockFileKeyWithVaultX(match.wrappedKey)
        .then((plainKey) => {
          if (!cancelled) {
            setSavedVaultKey(plainKey);
          }
        })
        .catch(() => {});
    } else if (match?.keyHex) {
      setSavedVaultKey(match.keyHex);
    }

    return () => { cancelled = true; };
  }, [cidInput, isVaultXConnected, address, vaultXIdentity]);

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
      <div className="flex items-start gap-2.5 rounded-xl border border-[#037DD6]/30 bg-[#141618] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#037DD6]" />
        <div className="text-xs text-[#848C96] leading-relaxed">
          <span className="text-[#037DD6] font-semibold">Browser-side sovereign decryption.</span>{" "}
          Encrypted bytes are fetched directly from IPFS and decrypted locally using your AES-256 key.
          The server never sees your key or the decrypted file content.
        </div>
      </div>

      {/* Optional notice if saved key is available in user's vault */}
      {savedVaultKey && cidValid && (
        <div className="flex items-center justify-between rounded-xl border border-[#F6851B]/30 bg-[#F6851B]/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#F6851B]" />
            <p className="text-xs text-[#F2F4F6]">
              Saved vault key found for this CID.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyInput(savedVaultKey);
              reset();
            }}
            className="text-xs font-semibold text-[#F6851B] hover:text-[#E2761B] underline transition-colors"
          >
            Autofill Key
          </button>
        </div>
      )}

      {/* CID input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-cid-input" className="text-xs font-semibold uppercase tracking-wider text-[#848C96]">
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
            "w-full rounded-xl border bg-[#141618] px-4 py-3 font-mono text-xs text-[#F2F4F6] placeholder:text-[#848C96] focus:outline-none transition-colors",
            cidInput.trim().length === 0
              ? "border-[#3B4046] focus:border-[#F6851B]"
              : cidValid
              ? "border-emerald-500/60 focus:border-emerald-400"
              : "border-red-500/60 focus:border-red-400"
          )}
        />
        {cidValid && (
          <a
            href={getIpfsUrl(cidInput.trim())}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#848C96] hover:text-[#037DD6] transition-colors"
          >
            <Globe className="h-2.5 w-2.5" />
            {getGatewayBase()}/ipfs/{cidInput.trim().slice(0, 20)}...
          </a>
        )}
      </div>

      {/* Key input — manual entry */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-key-input" className="text-xs font-semibold uppercase tracking-wider text-[#848C96]">
            2. AES-256 Decryption Key
          </label>
          <div className="flex items-center gap-3">
            {savedVaultKey && keyInput !== savedVaultKey && (
              <button
                type="button"
                onClick={() => {
                  setKeyInput(savedVaultKey);
                  reset();
                }}
                className="text-[11px] font-semibold text-[#F6851B] hover:text-[#E2761B] underline transition-colors"
              >
                Use Saved Vault Key
              </button>
            )}
            <span className={cn(
              "text-[10px] font-mono",
              keyInput.length === 64 ? "text-emerald-400" : keyInput.length > 0 ? "text-[#F6851B]" : "text-[#848C96]"
            )}>
              {keyInput.length}/64
            </span>
          </div>
        </div>
        <div className="relative">
          <input
            id="retrieve-key-input"
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value.trim()); reset(); }}
            placeholder="Paste 64-character hex key..."
            spellCheck={false}
            autoComplete="off"
            disabled={isProcessing}
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

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#141618]">
            <div className={cn(
              "h-full w-1/3 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]",
              stage === "fetching"
                ? "bg-[#037DD6]"
                : "bg-[#F6851B]"
            )} />
          </div>
          <p className="text-xs text-[#848C96] font-mono">{statusMessage}</p>
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
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-200",
            !canRetrieve || isProcessing
              ? "bg-[#24272A] text-[#848C96] cursor-not-allowed border border-[#3B4046]"
              : "bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md active:scale-[0.98]"
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
          <button type="button" onClick={reset} className="text-xs text-[#848C96] hover:text-[#F2F4F6] underline transition-colors">
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {stage === "done" && result && (
        <div className="space-y-4 rounded-2xl border border-[#3B4046] bg-[#24272A] p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white">Integrity Verified — File Decrypted</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#3B4046] bg-[#141618] px-3.5 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-[#F6851B]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#F2F4F6]">{result.name}</p>
              <p className="text-xs text-[#848C96]">{formatBytes(result.size)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              id="vault-download-decrypted-btn"
              onClick={() => downloadBlob(result.blob, result.name)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] py-2.5 text-xs font-bold text-white shadow-sm transition-all"
            >
              <Download className="h-4 w-4" />
              Download Decrypted File
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#3B4046] bg-[#141618] px-4 py-2.5 text-xs font-semibold text-[#848C96] hover:bg-[#2B2F34] hover:text-[#F2F4F6] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retrieve Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
