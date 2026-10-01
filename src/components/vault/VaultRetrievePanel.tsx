"use client";

/**
 * SecureVault — VaultRetrievePanel
 *
 * Retrieval and decryption flow:
 *   Enter CID → Fetch encrypted bytes from IPFS → Decrypt in browser → Download
 *
 * SECURITY:
 * - Encrypted bytes are fetched directly from a public IPFS gateway.
 * - Decryption happens entirely in the browser using WebCrypto AES-256-GCM.
 * - The AES key is NEVER sent to the server.
 * - Plaintext never leaves your device.
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
import { decryptFileFromManifest, type FileManifest, retrieveFileKey } from "@/lib/crypto/index";
import { fetchFromIpfs, getIpfsUrl, isValidCid, getGatewayBase } from "@/lib/ipfs/gateway";
import { cn } from "@/lib/utils";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { unlockFileKeyWithVaultX } from "@/lib/vaultxWallet";
import { getUserFiles } from "@/lib/fileStorage";
import { useAccount } from "wagmi";
import { OwlCompanion } from "@/components/ui/OwlCompanion";

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

  // When CID changes, check if there is a saved key available
  useEffect(() => {
    let cancelled = false;
    const cid = cidInput.trim();
    if (!isValidCid(cid)) {
      setSavedVaultKey(null);
      return;
    }

    const ownerKey = (isVaultXConnected && vaultXIdentity?.id)
      ? vaultXIdentity.id
      : (address?.toLowerCase() ?? "");
    if (!ownerKey) {
      setSavedVaultKey(null);
      return;
    }

    // Check IndexedDB key vault first
    retrieveFileKey(ownerKey, cid)
      .then((key) => {
        if (!cancelled && key) {
          setSavedVaultKey(key);
        }
      })
      .catch(() => {});

    // Check localStorage file records
    const files = getUserFiles(ownerKey);
    const match = files.find((f) => f.cid === cid || f.manifestCID === cid || f.id === cid);

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
    } else {
      setSavedVaultKey(null);
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
    setStatusMessage("Fetching data from IPFS gateway...");

    // ── 1. Fetch bytes from IPFS gateway ──────────────────────────
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
    setStatusMessage("Verifying integrity & decrypting in browser...");

    // ── 2. Decrypt in browser (supports Chunked Manifests & legacy bundles) ───
    try {
      let isManifest = false;
      let manifest: FileManifest | null = null;

      try {
        const text = new TextDecoder().decode(rawBuffer);
        if (text.trim().startsWith("{")) {
          const parsed = JSON.parse(text);
          if (parsed.algorithm === "AES-256-GCM" && Array.isArray(parsed.chunks)) {
            isManifest = true;
            manifest = parsed as FileManifest;
          }
        }
      } catch {
        // Not a JSON manifest
      }

      let decryptedBlob: Blob;
      let decryptedName: string;

      if (isManifest && manifest) {
        setStatusMessage(`Detected File Manifest with ${manifest.totalChunks} chunks. Verifying and decrypting...`);
        const manifestResult = await decryptFileFromManifest(
          manifest,
          key,
          fetchFromIpfs,
          (p) => {
            setStatusMessage(p.message);
          }
        );
        decryptedBlob = manifestResult.blob;
        decryptedName = manifestResult.fileName;
      } else {
        const encryptedFile = new File([rawBuffer], `${cid}.cyber10enc`, {
          type: "application/octet-stream",
        });
        const decrypted = await decryptFile(encryptedFile, key, (p) => {
          setStatusMessage(p.message);
        });
        decryptedBlob = decrypted.plainBlob;
        decryptedName = decrypted.originalName;
      }

      setResult({
        blob: decryptedBlob,
        name: decryptedName,
        size: decryptedBlob.size,
      });
      setStage("done");
      setStatusMessage("Decryption complete. Downloading file...");

      // Automatically trigger browser file download
      downloadBlob(decryptedBlob, decryptedName);
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
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="text-[#2563EB] font-bold">Browser-side sovereign decryption.</span>{" "}
          Encrypted bytes are fetched directly from IPFS and decrypted locally using your AES-256 key.
          The server never sees your key or the decrypted file content.
        </div>
      </div>

      {/* Owl Guardian Retrieval Companion Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 flex items-center gap-4">
        <OwlCompanion
          state={
            isProcessing
              ? "decrypting"
              : stage === "done"
              ? "success"
              : stage === "error"
              ? "error"
              : "idle"
          }
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900">
            {isProcessing
              ? "Guardian at Work: Bringing File Back"
              : stage === "done"
              ? "File Safely Decrypted"
              : stage === "error"
              ? "Decryption Interrupted"
              : "Ready to Retrieve & Decrypt"}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isProcessing
              ? "Downloading encrypted chunks from IPFS nodes, verifying 128-bit authentication tag, and reconstructing original data."
              : stage === "done"
              ? "Authentication tag matched. File downloaded to your local device."
              : stage === "error"
              ? "Verify that the IPFS CID and 64-character AES key are correct."
              : "Enter the IPFS CID and AES-256 decryption key below."}
          </p>
        </div>
      </div>

      {/* Optional notice if saved key is available in user's vault */}
      {savedVaultKey && cidValid && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#2563EB]" />
            <p className="text-xs text-slate-900 font-semibold">
              Saved vault key found for this CID.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyInput(savedVaultKey);
              reset();
            }}
            className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] underline transition-colors"
          >
            Autofill Key
          </button>
        </div>
      )}

      {/* CID input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-cid-input" className="text-xs font-bold uppercase tracking-wider text-slate-600">
            1. IPFS CID
          </label>
          {cidInput.trim().length > 0 && (
            <span className={cn("text-[10px] font-mono font-semibold", cidValid ? "text-emerald-600" : "text-red-500")}>
              {cidValid ? "✓ Valid CID format" : "✗ Invalid CID format"}
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
            "w-full rounded-xl border bg-white px-4 py-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors",
            cidInput.trim().length === 0
              ? "border-slate-200 focus:border-[#2563EB]"
              : cidValid
              ? "border-emerald-500 focus:border-emerald-600"
              : "border-red-400 focus:border-red-500"
          )}
        />
        {cidValid && (
          <a
            href={getIpfsUrl(cidInput.trim())}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#2563EB] transition-colors"
          >
            <Globe className="h-2.5 w-2.5" />
            {getGatewayBase()}/ipfs/{cidInput.trim().slice(0, 20)}...
          </a>
        )}
      </div>

      {/* Key input — manual entry */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="retrieve-key-input" className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] underline transition-colors"
              >
                Use Saved Vault Key
              </button>
            )}
            <span className={cn(
              "text-[10px] font-mono",
              keyInput.length === 64 ? "text-emerald-600 font-bold" : keyInput.length > 0 ? "text-[#2563EB]" : "text-slate-400"
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

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-[shimmer_1.2s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-slate-600 font-mono">{statusMessage}</p>
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
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs active:scale-[0.99]"
          )}
        >
          {isProcessing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          {isProcessing
            ? stage === "fetching"
              ? "Fetching encrypted payload from IPFS..."
              : "Decrypting locally in browser..."
            : "Retrieve & Decrypt"}
        </button>
      )}

      {/* Error */}
      {stage === "error" && errorMessage && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors">
            Try again
          </button>
        </div>
      )}

      {/* Success */}
      {stage === "done" && result && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900">Integrity Verified — File Decrypted</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-[#2563EB]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{result.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{formatBytes(result.size)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              id="vault-download-decrypted-btn"
              onClick={() => downloadBlob(result.blob, result.name)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] py-2.5 text-xs font-bold text-white shadow-xs transition-all"
            >
              <Download className="h-4 w-4" />
              Download Decrypted File
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
