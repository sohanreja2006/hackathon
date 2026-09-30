"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  Download,
  KeyRound,
  Loader2,
  AlertCircle,
  FileDown,
  Check,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatBytes, downloadAndDecryptFromIpfs } from "@/lib/crypto";
import { OwlCompanion, OwlState } from "@/components/ui/OwlCompanion";
import { formatShareCodeInput, isValidShareCodeFormat } from "@/lib/shareCode";
import { lookupSecureShare, accessSecureShare } from "@/lib/payloadClient";
import { getIpfsUrl, fetchFromIpfs } from "@/lib/ipfs/gateway";
import { getAllVaultFiles } from "@/lib/fileStorage";

interface ReceiveSecureFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function ReceiveSecureFileModal({
  isOpen,
  onClose,
  initialCode = "",
}: ReceiveSecureFileModalProps) {
  // Input code state
  const [shareCode, setShareCode] = useState(initialCode ? formatShareCodeInput(initialCode) : "");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Share found metadata
  const [foundShare, setFoundShare] = useState<{
    shareCode: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    manifestCID?: string;
    encryptionAlgorithm: string;
    integrityAlgorithm: string;
    expiresAt: string | null;
    passwordProtected: boolean;
  } | null>(null);

  // Password state if required
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // AES Decryption Key state
  const [keyInput, setKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Retrieval & Decryption state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [verifiedChunks, setVerifiedChunks] = useState<number[]>([]);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState<{ name: string; url: string } | null>(null);

  // Dynamic Owl State
  const [owlState, setOwlState] = useState<OwlState>("idle");

  // Cleaned AES-256 key input
  const cleanKey = keyInput.trim().replace(/^0x/i, "").replace(/[\s\-:]/g, "");

  // Auto-detect zero-knowledge key from URL hash or query param (#key=... or ?key=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      const keyFromUrl = urlParams.get("key");
      const match = hash.match(/key=([0-9a-fA-F]{64})/i) || hash.match(/#([0-9a-fA-F]{64})/i);
      const foundKey = match ? match[1] : (keyFromUrl && /^[0-9a-fA-F]{64}$/.test(keyFromUrl) ? keyFromUrl : null);
      if (foundKey) {
        setKeyInput(foundKey);
      }
    }
  }, []);

  // Look for a matching encrypted file in this browser's local vault
  const matchingLocalFile = React.useMemo(() => {
    if (!foundShare || typeof window === "undefined") return null;
    try {
      const vaultFiles = getAllVaultFiles();
      return (
        vaultFiles.find((f) => {
          if (!f.keyHex) return false;
          if (foundShare.manifestCID && (f.manifestCID === foundShare.manifestCID || f.cid === foundShare.manifestCID)) {
            return true;
          }
          if (f.fileName === foundShare.fileName && Math.abs(f.fileSize - foundShare.fileSize) < 100) {
            return true;
          }
          return false;
        }) || null
      );
    } catch {
      return null;
    }
  }, [foundShare]);

  // Auto-fill key if local match exists and input is empty
  useEffect(() => {
    if (matchingLocalFile?.keyHex && !keyInput) {
      setKeyInput(matchingLocalFile.keyHex);
    }
  }, [matchingLocalFile]);

  useEffect(() => {
    if (initialCode) {
      const formatted = formatShareCodeInput(initialCode);
      setShareCode(formatted);
      if (isValidShareCodeFormat(formatted)) {
        handleLookup(formatted);
      }
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatShareCodeInput(e.target.value);
    setShareCode(formatted);
    setLookupError(null);
    setFoundShare(null);
    setOwlState(formatted.length > 3 ? "file_selected" : "idle");

    if (isValidShareCodeFormat(formatted)) {
      handleLookup(formatted);
    }
  };

  const handleLookup = async (codeToLookup = shareCode) => {
    if (!isValidShareCodeFormat(codeToLookup)) {
      setLookupError("Please enter a valid format: SV-XXXX-XXXX-XXXX");
      setOwlState("error");
      return;
    }

    try {
      setIsLookingUp(true);
      setLookupError(null);
      setOwlState("verifying");

      const res = await lookupSecureShare(codeToLookup);
      if (!res.success || !res.share) {
        setLookupError(res.error || "Share not found. Check the code and try again.");
        setOwlState("error");
        setFoundShare(null);
        return;
      }

      setFoundShare(res.share);
      setOwlState("idle");
    } catch {
      setLookupError("Failed to lookup share code. Please try again.");
      setOwlState("error");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleStartDecryptionAndDownload = async () => {
    if (!foundShare) return;

    if (foundShare.passwordProtected && !passwordInput.trim()) {
      setPasswordError("Password is required to access this file.");
      return;
    }

    const keyToUse = cleanKey;
    if (!keyToUse) {
      setKeyError("Please enter the 64-character AES-256 decryption key provided by the owner.");
      return;
    }

    if (keyToUse.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyToUse)) {
      if (keyToUse.length < 64) {
        setKeyError(
          `Incomplete key: entered ${keyToUse.length} of 64 hex characters. The AES key is a 64-character hex string generated during file encryption (different from the share password).`
        );
      } else if (keyToUse.length > 64) {
        setKeyError(
          `Invalid key length: ${keyToUse.length} characters (expected 64). Please check for extra characters or spaces.`
        );
      } else {
        setKeyError("Invalid key format: AES key must contain only hexadecimal characters (0-9, a-f).");
      }
      return;
    }

    try {
      setIsProcessing(true);
      setIntegrityError(null);
      setPasswordError(null);
      setKeyError(null);
      setOwlState("encrypting");
      setProgressMessage("Validating share code and authorization...");

      // 1. Access share
      const accessRes = await accessSecureShare(foundShare.shareCode, passwordInput.trim() || undefined);
      if (!accessRes.success) {
        if (accessRes.error?.toLowerCase().includes("password")) {
          setPasswordError(accessRes.error);
          setOwlState("error");
          return;
        }
        setLookupError(accessRes.error || "Failed to access share.");
        setOwlState("error");
        return;
      }

      const { file, manifest, chunks } = accessRes;

      // 2. Chunks & Integrity Verification
      const totalChunks = chunks?.length || manifest?.chunks?.length || 1;
      setChunkProgress({ current: 0, total: totalChunks });
      setProgressMessage(`Retrieving encrypted chunks (0 / ${totalChunks})...`);

      const targetChunks = (chunks && chunks.length > 0) ? chunks : (manifest?.chunks || []);
      const verifiedIndices: number[] = [];

      // Download and verify each chunk hash
      if (targetChunks.length > 0) {
        for (let i = 0; i < targetChunks.length; i++) {
          const ch = targetChunks[i];
          setProgressMessage(`Retrieving encrypted chunk ${i + 1} of ${totalChunks}...`);
          setChunkProgress({ current: i + 1, total: totalChunks });

          // Fetch chunk buffer from IPFS with multi-gateway failover
          let chunkBuffer: ArrayBuffer;
          try {
            chunkBuffer = await fetchFromIpfs(ch.cid);
          } catch {
            const gatewayUrl = getIpfsUrl(ch.cid);
            const chunkRes = await fetch(gatewayUrl);
            if (!chunkRes.ok) {
              throw new Error(`Failed to fetch chunk ${i + 1} (${ch.cid}) from IPFS.`);
            }
            chunkBuffer = await chunkRes.arrayBuffer();
          }

          // Compute SHA-256 hash
          const hashBuffer = await crypto.subtle.digest("SHA-256", chunkBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

          if (ch.hash && computedHash.toLowerCase() !== ch.hash.toLowerCase()) {
            setOwlState("error");
            setIntegrityError(`Integrity verification failed on chunk ${i + 1}. Checksum mismatch.`);
            return;
          }

          verifiedIndices.push(i + 1);
          setVerifiedChunks([...verifiedIndices]);
        }
      }

      // 3. Decrypt payload locally using WebCrypto
      setOwlState("decrypting");
      setProgressMessage("All chunks verified! Decrypting locally in browser WebCrypto...");

      const targetCid =
        file.manifestCID ||
        foundShare?.manifestCID ||
        chunks?.[0]?.cid ||
        manifest?.manifestCID ||
        (file as unknown as { cid?: string })?.cid;
      if (!targetCid) {
        throw new Error("Missing content CID for decryption.");
      }

      const decrypted = await downloadAndDecryptFromIpfs(
        targetCid,
        keyToUse,
        undefined,
        (msg) => setProgressMessage(msg)
      );

      // 4. File reconstructed
      const url = window.URL.createObjectURL(decrypted.plainBlob);
      const fileName = decrypted.originalName || file.fileName;
      setDownloadReady({ name: fileName, url });
      setOwlState("success");
      setProgressMessage("File reconstructed and ready for download!");

      // Auto trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Retrieval failed.";
      if (
        msg.toLowerCase().includes("operation failed") ||
        msg.toLowerCase().includes("operationerror") ||
        msg.toLowerCase().includes("tag")
      ) {
        setKeyError("Decryption failed: Incorrect AES-256 key. Tag mismatch.");
      } else {
        setIntegrityError(`Error: ${msg}`);
      }
      setOwlState("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setShareCode("");
    setFoundShare(null);
    setLookupError(null);
    setPasswordInput("");
    setPasswordError(null);
    setKeyInput("");
    setKeyError(null);
    setDownloadReady(null);
    setVerifiedChunks([]);
    setChunkProgress(null);
    setOwlState("idle");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 shrink-0">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Receive a Secure File</h2>
              <p className="text-[11px] text-slate-500">
                Retrieve & decrypt an encrypted file using a Secure Share Code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Owl Companion Reactive Observer */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 flex items-center gap-3.5">
            <OwlCompanion state={owlState} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900">Guardian Verification</div>
              <p className="text-[11px] text-slate-600">
                {downloadReady
                  ? "File reconstructed safely! Decryption happened completely in your browser."
                  : foundShare
                  ? "Secure file located. Chunks will be verified with SHA-256 before local decryption."
                  : "Enter the Secure Share Code below to locate the encrypted IPFS payload."}
              </p>
            </div>
          </div>

          {!downloadReady ? (
            <>
              {/* Step 1: Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Enter Secure Share Code</span>
                  {foundShare && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[11px] text-[#2563EB] hover:underline"
                    >
                      Change Code
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shareCode}
                    onChange={handleCodeChange}
                    placeholder="SV-9X4K-7P2M-Q81D"
                    disabled={isProcessing || !!foundShare}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 font-mono text-base font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
                  />
                  {isLookingUp && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
                    </div>
                  )}
                  {foundShare && !isLookingUp && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>

              {lookupError && (
                <div className="flex items-center gap-2 p-3 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-600 animate-in fade-in duration-150">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {/* Step 2: Valid Share Information Card */}
              {foundShare && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[260px]">
                        {foundShare.fileName}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-600">
                        {formatBytes(foundShare.fileSize)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="h-3 w-3" /> Encrypted
                      </span>
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <ShieldCheck className="h-3 w-3" /> Integrity Protected
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Unlimited Access
                      </span>
                    </div>
                  </div>

                  {/* Password Prompt if Protected */}
                  {foundShare.passwordProtected && (
                    <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Lock className="h-3.5 w-3.5 text-amber-700" />
                        <span>This file requires a password</span>
                      </div>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter share password..."
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      {passwordError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{passwordError}</p>
                      )}
                    </div>
                  )}

                  {/* Decryption Key Section */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-[#2563EB]" />
                        <span>AES-256 Decryption Key</span>
                        {cleanKey.length > 0 && (
                          <span
                            className={`text-[10px] font-mono font-semibold ${
                              cleanKey.length === 64 ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            ({cleanKey.length}/64)
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {matchingLocalFile?.keyHex && cleanKey !== matchingLocalFile.keyHex && (
                          <button
                            type="button"
                            onClick={() => {
                              setKeyInput(matchingLocalFile.keyHex!);
                              setKeyError(null);
                            }}
                            className="text-[10px] font-semibold text-[#2563EB] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                          >
                            Fill from Vault
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(!showKeyInput)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          {showKeyInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{showKeyInput ? "Hide" : "Show"}</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type={showKeyInput ? "text" : "password"}
                      value={keyInput}
                      onChange={(e) => {
                        setKeyInput(e.target.value);
                        setKeyError(null);
                      }}
                      placeholder="Paste 64-character hexadecimal key provided by sender..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:bg-white focus:border-[#2563EB] focus:outline-none"
                    />

                    {matchingLocalFile?.keyHex && cleanKey === matchingLocalFile.keyHex && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Check className="h-3 w-3 shrink-0" />
                        <span>Decryption key automatically matched from your local vault file history.</span>
                      </div>
                    )}

                    {keyError ? (
                      <p className="text-[11px] text-rose-600 font-semibold leading-relaxed">{keyError}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        The 64-character AES key was created when the owner encrypted this file. It is required to reconstruct the plaintext on your machine.
                      </p>
                    )}
                  </div>

                  {/* Live Progress & Integrity Tracker */}
                  {isProcessing && (
                    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-blue-900 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                          <span>{progressMessage}</span>
                        </span>
                        {chunkProgress && (
                          <span className="font-mono text-[11px]">
                            {chunkProgress.current} / {chunkProgress.total}
                          </span>
                        )}
                      </div>

                      {verifiedChunks.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono flex-wrap">
                          <Layers className="h-3 w-3 shrink-0" />
                          <span>Chunks verified:</span>
                          {verifiedChunks.slice(0, 8).map((idx) => (
                            <span key={idx} className="bg-emerald-100 px-1.5 py-0.5 rounded">
                              #{String(idx).padStart(3, "0")} ✓
                            </span>
                          ))}
                          {verifiedChunks.length > 8 && <span>+{verifiedChunks.length - 8} more</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {integrityError && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{integrityError}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Ready Download Success Screen */
            <div className="space-y-5 text-center py-3 animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Decrypted & Verified Successfully</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{downloadReady.name}</h3>
                <p className="text-xs text-slate-500">
                  Zero plaintext was transmitted over the network.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center gap-3">
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                <a
                  href={downloadReady.url}
                  download={downloadReady.name}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Decrypted File</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-end gap-2">
          {!foundShare ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={!isValidShareCodeFormat(shareCode) || isLookingUp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Searching Share...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </>
          ) : !downloadReady ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStartDecryptionAndDownload}
                disabled={isProcessing || !keyInput}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing File...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Verify, Decrypt & Download</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
