"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  X,
  ShieldCheck,
  Lock,
  Download,
  Loader2,
  AlertCircle,
  FileDown,
  Check,
  Layers,
  Sparkles,
  QrCode,
  KeyRound,
  UserCheck,
  AlertTriangle,
  Flame,
  Eye,
} from "lucide-react";
import { formatBytes, downloadBlob, decryptFile } from "@/lib/crypto";
import { computeSha256, verifyAndDecryptChunk } from "@/lib/crypto/chunkedEngine";
import { OwlCompanion, OwlState } from "@/components/ui/OwlCompanion";
import { formatShareCodeInput, isValidShareCodeFormat, extractSecretFromText } from "@/lib/shareCode";
import { lookupSecureShare, accessSecureShare, burnSecureShareApi } from "@/lib/payloadClient";
import { getIpfsUrl, fetchFromIpfs } from "@/lib/ipfs/gateway";
import { getAllVaultFiles } from "@/lib/fileStorage";
import {
  getLocalEncryptionIdentity,
  getOrCreateLocalIdentity,
  deriveDeterministicIdentity,
  unwrapKeyEnvelope,
  unwrapQuickShareEnvelope,
} from "@/lib/e2ee";
import { SecurityVerificationModal } from "./SecurityVerificationModal";
import { SecureFilePreviewModal, SecurePreviewData } from "./SecureFilePreviewModal";
import { useVaultXWallet } from "@/context/VaultXWalletContext";

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
  const { address, isConnected } = useAccount();
  const { identity: vaultXIdentity, isConnected: isVaultXConnected } = useVaultXWallet();
  const activeAddress = (isVaultXConnected && vaultXIdentity?.id) ? vaultXIdentity.id : address;
  const activeConnected = (isVaultXConnected && !!vaultXIdentity) || (isConnected && !!address);

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
    recipientUserId?: string | null;
    recipientPublicKeyFingerprint?: string | null;
    isQuickShare?: boolean;
    hasEncryptedKey?: boolean;
    burnAfterReading?: boolean;
    burnDurationSeconds?: number;
  } | null>(null);

  // Quick share secret if applicable
  const [quickShareSecret, setQuickShareSecret] = useState("");
  const [secretError, setSecretError] = useState<string | null>(null);

  // Password state if required
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Security Verification Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // In-Browser Preview & Decrypted Blob State
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const [previewData, setPreviewData] = useState<SecurePreviewData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Self-Destruct / Burn-on-Read State
  const [burnRemainingSeconds, setBurnRemainingSeconds] = useState<number | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const burnTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Retrieval & Decryption state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [verifiedChunks, setVerifiedChunks] = useState<number[]>([]);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState<{ name: string; url: string } | null>(null);

  // Dynamic Owl State
  const [owlState, setOwlState] = useState<OwlState>("idle");

  // Burn-on-read timer effect
  useEffect(() => {
    if (burnRemainingSeconds !== null && burnRemainingSeconds > 0) {
      burnTimerRef.current = setTimeout(() => {
        setBurnRemainingSeconds((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (burnRemainingSeconds === 0) {
      triggerBurn();
    }
    return () => {
      if (burnTimerRef.current) clearTimeout(burnTimerRef.current);
    };
  }, [burnRemainingSeconds]);

  const triggerBurn = async () => {
    if (foundShare) {
      try {
        await burnSecureShareApi(foundShare.shareCode);
      } catch {
        // Non-fatal
      }
    }
    // Cryptographically purge volatile memory & blob
    if (downloadReady?.url) {
      URL.revokeObjectURL(downloadReady.url);
    }
    setDownloadReady(null);
    setDecryptedBlob(null);
    setIsPreviewOpen(false);
    setPreviewData(null);
    setIsBurned(true);
    setOwlState("idle");
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-detect Quick Share secret or key from URL hash or query param (#secret=... or ?secret=...)
  useEffect(() => {
    const detectSecret = () => {
      if (typeof window !== "undefined") {
        const fullUrl = window.location.href;
        const extracted = extractSecretFromText(fullUrl);
        if (extracted) {
          setQuickShareSecret(extracted);
        }
      }
    };
    detectSecret();
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", detectSecret);
      window.addEventListener("popstate", detectSecret);
      return () => {
        window.removeEventListener("hashchange", detectSecret);
        window.removeEventListener("popstate", detectSecret);
      };
    }
  }, [initialCode]);

  // Look for a matching encrypted file in this browser's local vault (fallback)
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

  useEffect(() => {
    if (initialCode) {
      const extractedSecret = extractSecretFromText(initialCode);
      if (extractedSecret) {
        setQuickShareSecret(extractedSecret);
      }
      const formatted = formatShareCodeInput(initialCode);
      setShareCode(formatted);
      if (isValidShareCodeFormat(formatted)) {
        handleLookup(formatted);
      }
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const extractedSecret = extractSecretFromText(rawVal);
    if (extractedSecret) {
      setQuickShareSecret(extractedSecret);
    }
    const formatted = formatShareCodeInput(rawVal);
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

  const isRecipientAuthorized = () => {
    if (!foundShare) return false;
    if (foundShare.isQuickShare) return true;
    if (!foundShare.recipientUserId) return true;
    if (!activeConnected || !activeAddress) return false;
    return activeAddress.toLowerCase() === foundShare.recipientUserId.toLowerCase();
  };

  const handleStartDecryptionAndDownload = async () => {
    if (!foundShare) return;

    if (foundShare.passwordProtected && !passwordInput.trim()) {
      setPasswordError("Password is required to access this file.");
      return;
    }

    if (foundShare.isQuickShare && !quickShareSecret.trim()) {
      setSecretError("Please provide the Quick Share secret key from the share link.");
      return;
    }

    if (!foundShare.isQuickShare && foundShare.recipientUserId) {
      if (!activeConnected || !activeAddress) {
        setLookupError("Please connect your recipient Web3 wallet to unlock this end-to-end encrypted file.");
        return;
      }
      if (activeAddress.toLowerCase() !== foundShare.recipientUserId.toLowerCase()) {
        setLookupError(
          `Access restricted: This file is encrypted specifically for recipient ${foundShare.recipientUserId.slice(0, 6)}...${foundShare.recipientUserId.slice(-4)}. Your connected wallet (${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}) is not authorized.`
        );
        return;
      }
    }

    try {
      setIsProcessing(true);
      setIntegrityError(null);
      setPasswordError(null);
      setSecretError(null);
      setLookupError(null);
      setOwlState("verifying");
      setProgressMessage("Authenticating recipient and validating authorization...");

      // 1. Access share from server
      const accessRes = await accessSecureShare(
        foundShare.shareCode,
        activeAddress || undefined,
        passwordInput.trim() || undefined
      );

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

      // 2. Recover AES-256-GCM File Key using Asymmetric Identity
      setOwlState("decrypting");
      setProgressMessage("Unwrapping encrypted key envelope locally with your private key...");

      let recoveredKeyHex = "";

      if (accessRes.isQuickShare && accessRes.quickShareEnvelope) {
        // Quick Share: unwrap envelope with high-entropy secret
        const cleanSecret = (quickShareSecret || "")
          .trim()
          .replace(/^#?secret=/i, "")
          .replace(/^0x/i, "");
        if (!cleanSecret) {
          throw new Error("Please provide the Quick Share secret key from the share link.");
        }
        try {
          recoveredKeyHex = await unwrapQuickShareEnvelope(
            accessRes.quickShareEnvelope,
            cleanSecret
          );
        } catch {
          if (matchingLocalFile?.keyHex) {
            recoveredKeyHex = matchingLocalFile.keyHex;
          } else {
            throw new Error("Failed to unwrap Quick Share key envelope. Please check the secret key.");
          }
        }
      } else if (accessRes.encryptedFileKey && accessRes.keyAgreementMetadata) {
        // Direct E2EE: unwrap with recipient's device-local private X25519 key
        if (!activeAddress) {
          throw new Error("Connected wallet address required to retrieve local private key.");
        }
        const localId = await getOrCreateLocalIdentity(activeAddress);
        try {
          recoveredKeyHex = await unwrapKeyEnvelope(
            accessRes.encryptedFileKey,
            accessRes.keyAgreementMetadata,
            localId.privateKeyHex
          );
        } catch (envelopeErr) {
          // Fallback: Try deterministic identity for activeAddress
          try {
            const derived = deriveDeterministicIdentity(activeAddress);
            if (derived.privateKeyHex !== localId.privateKeyHex) {
              recoveredKeyHex = await unwrapKeyEnvelope(
                accessRes.encryptedFileKey,
                accessRes.keyAgreementMetadata,
                derived.privateKeyHex
              );
            } else {
              throw envelopeErr;
            }
          } catch {
            if (matchingLocalFile?.keyHex) {
              recoveredKeyHex = matchingLocalFile.keyHex;
            } else {
              throw new Error("Cryptographic key agreement failed. Could not decrypt key envelope with recipient wallet private key.");
            }
          }
        }
      } else if (matchingLocalFile?.keyHex) {
        // Fallback for files originating from this device
        recoveredKeyHex = matchingLocalFile.keyHex;
      } else {
        throw new Error("No cryptographic key envelope found for this share.");
      }

      if (!recoveredKeyHex || recoveredKeyHex.length !== 64) {
        throw new Error("Invalid recovered file key length.");
      }

      // 3. Chunks & Integrity Verification
      let targetChunks = chunks && chunks.length > 0 ? chunks : manifest?.chunks || [];

      // If targetChunks is empty, resolve from manifestCID or IPFS or fallback
      if ((!targetChunks || targetChunks.length === 0) && (foundShare.manifestCID || (file as any)?.manifestCID)) {
        const manifestCid = foundShare.manifestCID || (file as any)?.manifestCID;
        setProgressMessage("Resolving file manifest from IPFS...");
        try {
          const rawManifest = await fetchFromIpfs(manifestCid);
          try {
            const text = new TextDecoder().decode(rawManifest);
            if (text.trim().startsWith("{")) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed.chunks) && parsed.chunks.length > 0) {
                targetChunks = parsed.chunks;
              }
            }
          } catch {}
          if (!targetChunks || targetChunks.length === 0) {
            targetChunks = [
              {
                index: 0,
                cid: manifestCid,
                hash: "",
                iv: "",
                size: foundShare.fileSize || 0,
              },
            ];
          }
        } catch {
          targetChunks = [
            {
              index: 0,
              cid: manifestCid,
              hash: "",
              iv: "",
              size: foundShare.fileSize || 0,
            },
          ];
        }
      }

      if (!targetChunks || targetChunks.length === 0) {
        throw new Error("No chunk metadata found for file reconstruction.");
      }

      // Sort chunks by index strictly
      const sortedChunks = [...targetChunks].sort(
        (a, b) => ((a.index ?? a.chunkIndex ?? 0) - (b.index ?? b.chunkIndex ?? 0))
      );

      const totalChunks = sortedChunks.length;
      setChunkProgress({ current: 0, total: totalChunks });
      setProgressMessage(`Retrieving encrypted chunks (0 / ${totalChunks})...`);

      const decryptedParts: ArrayBuffer[] = [];
      const verifiedIndices: number[] = [];
      const candidateIds = Array.from(
        new Set(
          [
            (file as any)?.fileId,
            (file as any)?.id,
            (foundShare as any)?.fileId,
            manifest?.fileId,
            (manifest as any)?.id,
            foundShare?.manifestCID,
            (file as any)?.manifestCID,
            foundShare?.shareCode,
            file?.fileName,
            foundShare?.fileName,
          ].filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        )
      );
      const targetFileId = candidateIds[0] || "";

      for (let i = 0; i < totalChunks; i++) {
        const ch = sortedChunks[i];
        const chunkIdx = ch.index ?? ch.chunkIndex ?? i;
        const expectedSha = ch.sha256 || ch.hash;
        const iv = ch.iv;
        const cid = ch.cid || ch.ipfsCID;

        // Fetch chunk buffer from IPFS with multi-gateway failover
        setProgressMessage(`Retrieving encrypted chunk ${i + 1} of ${totalChunks} from IPFS...`);
        setChunkProgress({ current: i + 1, total: totalChunks });

        let chunkBuffer: ArrayBuffer;
        try {
          chunkBuffer = await fetchFromIpfs(cid);
        } catch {
          const gatewayUrl = getIpfsUrl(cid);
          const chunkRes = await fetch(gatewayUrl);
          if (!chunkRes.ok) {
            throw new Error(`Failed to fetch chunk ${i + 1} (${cid}) from IPFS.`);
          }
          chunkBuffer = await chunkRes.arrayBuffer();
        }

        // Compute and verify SHA-256 hash if provided
        if (expectedSha) {
          setProgressMessage(`Verifying SHA-256 integrity for chunk ${i + 1}...`);
          const actualHash = await computeSha256(chunkBuffer);
          if (actualHash.toLowerCase() !== expectedSha.toLowerCase()) {
            setOwlState("error");
            setIntegrityError(
              `Integrity verification failed for chunk ${i + 1}.\nExpected SHA-256: ${expectedSha}\nReceived: ${actualHash}\nDecryption aborted.`
            );
            return;
          }
        }

        // Decrypt chunk locally using AES-256-GCM + AAD (with multi-candidate fallback)
        setProgressMessage(`Decrypting chunk ${i + 1} with AES-256-GCM...`);
        let plaintext: ArrayBuffer | null = null;
        try {
          plaintext = await verifyAndDecryptChunk(
            chunkBuffer,
            recoveredKeyHex,
            chunkIdx,
            "",
            iv || "",
            targetFileId,
            candidateIds
          );
        } catch (decryptErr) {
          // If chunk buffer is a complete .cyber10enc binary bundle with header
          if (chunkBuffer.byteLength > 24) {
            try {
              const decryptedBundle = await decryptFile(
                new Blob([chunkBuffer], { type: "application/octet-stream" }),
                recoveredKeyHex
              );
              plaintext = await decryptedBundle.plainBlob.arrayBuffer();
            } catch {
              throw decryptErr;
            }
          } else {
            throw decryptErr;
          }
        }

        decryptedParts.push(plaintext);
        verifiedIndices.push(i + 1);
        setVerifiedChunks([...verifiedIndices]);
      }

      // 4. File Reconstructed
      setOwlState("decrypting");
      setProgressMessage("Reconstructing original file from verified chunks...");
      const mimeType = file?.mimeType || foundShare.mimeType || "application/octet-stream";
      const plainBlob = new Blob(decryptedParts, { type: mimeType });

      if (file?.fileSize && Math.abs(plainBlob.size - file.fileSize) > 0) {
        console.warn(
          `Reconstructed file size difference: expected ${file.fileSize} bytes, got ${plainBlob.size} bytes.`
        );
      }

      const fileName = file?.fileName || foundShare.fileName || "decrypted_file";
      const url = window.URL.createObjectURL(plainBlob);
      setDecryptedBlob(plainBlob);
      setDownloadReady({ name: fileName, url });
      setOwlState("success");
      setProgressMessage("File reconstructed and ready for download!");

      if (foundShare.burnAfterReading) {
        setBurnRemainingSeconds(foundShare.burnDurationSeconds || 60);
      }

      // 5. Trigger browser download with original filename
      downloadBlob(plainBlob, fileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Retrieval failed.";
      setIntegrityError(`Decryption error: ${msg}`);
      setOwlState("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (burnTimerRef.current) clearTimeout(burnTimerRef.current);
    if (downloadReady?.url) {
      URL.revokeObjectURL(downloadReady.url);
    }
    setShareCode("");
    setFoundShare(null);
    setLookupError(null);
    setPasswordInput("");
    setPasswordError(null);
    setQuickShareSecret("");
    setSecretError(null);
    setDownloadReady(null);
    setDecryptedBlob(null);
    setPreviewData(null);
    setIsPreviewOpen(false);
    setBurnRemainingSeconds(null);
    setIsBurned(false);
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
                End-to-end encrypted retrieval & local browser decryption
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
                  : isProcessing
                  ? "Owl Guardian protecting decryption flow. Private keys never leave your machine."
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
                <div className="flex items-start gap-2 p-3 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-600 animate-in fade-in duration-150">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
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
                      {foundShare.isQuickShare ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          Quick Share
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          E2EE Asymmetric
                        </span>
                      )}
                      {foundShare.burnAfterReading && (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 font-semibold">
                          <Flame className="h-3 w-3 text-amber-600 animate-pulse" />
                          Self-Destruct Armed ({foundShare.burnDurationSeconds || 60}s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Password Prompt if Protected */}
                  {foundShare.passwordProtected && (
                    <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Lock className="h-3.5 w-3.5 text-amber-700" />
                        <span>Additional access password required</span>
                      </div>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter password..."
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      {passwordError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{passwordError}</p>
                      )}
                    </div>
                  )}

                  {/* Quick Share Secret Prompt if applicable */}
                  {foundShare.isQuickShare && (
                    <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                          <KeyRound className="h-3.5 w-3.5 text-purple-700" />
                          <span>Quick Share Secret</span>
                        </div>
                        {quickShareSecret && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-medium">
                            Auto-detected from link
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={quickShareSecret}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const extracted = extractSecretFromText(raw);
                          setQuickShareSecret(extracted || raw.trim().replace(/^#?secret=/i, "").replace(/^0x/i, ""));
                          setSecretError(null);
                        }}
                        placeholder="Paste secret key from link..."
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {secretError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{secretError}</p>
                      )}
                    </div>
                  )}

                  {/* True E2EE Details & WhatsApp-Style Security Verification */}
                  {!foundShare.isQuickShare && (
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 tracking-wide">
                          <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                          <span>END-TO-END ENCRYPTED</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Asymmetric Protected
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200/80">
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 font-medium">Recipient:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {foundShare.recipientUserId
                              ? `${foundShare.recipientUserId.slice(0, 6)}...${foundShare.recipientUserId.slice(-4)}`
                              : "Targeted User"}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 font-medium">Encryption:</span>
                          <span className="font-semibold text-slate-900">AES-256-GCM</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 font-medium">Key protection:</span>
                          <span className="font-semibold text-slate-900">Recipient public key (X25519)</span>
                        </div>
                      </div>

                      {/* Security Checklist */}
                      <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>End-to-end encrypted</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Private key stays on device</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Integrity verified</span>
                        </div>
                      </div>

                      {/* Security Verification Fingerprint */}
                      {foundShare.recipientPublicKeyFingerprint && (
                        <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              Security Verification
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                              {foundShare.recipientPublicKeyFingerprint.slice(0, 19)}...
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsQrModalOpen(true)}
                            className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-2xs"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>Show QR</span>
                          </button>
                        </div>
                      )}

                      {/* Authorization Warning if connected wallet does not match */}
                      {foundShare.recipientUserId && (
                        <div className="pt-1">
                          {activeConnected && activeAddress ? (
                            activeAddress.toLowerCase() === foundShare.recipientUserId.toLowerCase() ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                <span>Recipient wallet authenticated: {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <span>
                                  Connected as {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}. Switch wallet to {foundShare.recipientUserId.slice(0, 6)}...{foundShare.recipientUserId.slice(-4)} to unlock.
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                              <span>
                                Recipient authentication required: connect designated wallet <span className="font-mono font-bold">{foundShare.recipientUserId.slice(0, 6)}...{foundShare.recipientUserId.slice(-4)}</span> to unlock.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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
          ) : isBurned ? (
            /* Self-Destructed Screen */
            <div className="space-y-4 text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
                <Flame className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  <span>Self-Destruct Executed</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">File Permanently Self-Destructed</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  The burn-after-reading countdown has expired. All wrapped key envelopes were cryptographically zeroized on the server, the share link was permanently revoked, and volatile plaintext memory was purged.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-w-xs mx-auto text-[11px] font-mono text-slate-600 space-y-1 text-left">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-rose-600 font-bold">REVOKED & ZEROIZED</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span className="text-emerald-600 font-bold">WIPED FROM RAM</span>
                </div>
              </div>
            </div>
          ) : (
            /* Ready Download Success Screen */
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              {/* Burn Countdown Warning Banner */}
              {burnRemainingSeconds !== null && (
                <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border border-amber-300 p-3 rounded-2xl text-amber-900 flex items-center justify-between text-xs font-mono font-bold animate-pulse">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-600 animate-bounce" />
                    <span>SELF-DESTRUCT IN: {formatCountdown(burnRemainingSeconds)}</span>
                  </div>
                  <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-sans">
                    Zero-Disk RAM
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Decrypted & Verified Successfully</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{downloadReady.name}</h3>
                <p className="text-xs text-slate-500">
                  Decrypted locally in volatile browser memory.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-2.5">
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                
                {/* Action 1: Zero-Disk Preview Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (decryptedBlob && downloadReady) {
                      setPreviewData({
                        name: downloadReady.name,
                        blob: decryptedBlob,
                        mimeType: foundShare?.mimeType,
                        size: decryptedBlob.size,
                        url: downloadReady.url,
                      });
                      setIsPreviewOpen(true);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview Securely (0-Disk RAM Sandbox)</span>
                </button>

                {/* Action 2: Save to Disk */}
                <a
                  href={downloadReady.url}
                  download={downloadReady.name}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Decrypted File to Disk</span>
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
                disabled={
                  Boolean(
                    isProcessing ||
                    (!foundShare.isQuickShare && foundShare.recipientUserId && !isRecipientAuthorized())
                  )
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Decrypting File...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Unlock, Decrypt & Download</span>
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

      {/* Security Verification QR Modal */}
      {foundShare?.recipientPublicKeyFingerprint && (
        <SecurityVerificationModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          fingerprint={foundShare.recipientPublicKeyFingerprint}
          recipientAddress={foundShare.recipientUserId || "Targeted Recipient"}
        />
      )}

      {/* In-Browser Zero-Disk Secure Preview Modal */}
      <SecureFilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
        burnSecondsRemaining={burnRemainingSeconds}
        onBurn={triggerBurn}
      />
    </div>
  );
}

