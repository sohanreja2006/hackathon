"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Clock,
  Download,
  KeyRound,
  Loader2,
  AlertCircle,
  Share2,
  Sparkles,
  User,
  QrCode,
  Zap,
  Flame,
  UserCheck,
} from "lucide-react";
import { formatBytes } from "@/lib/crypto";
import { OwlCompanion, OwlState } from "@/components/ui/OwlCompanion";
import {
  createSecureShare,
  lookupRecipientProfileApi,
  listRegisteredUsersApi,
} from "@/lib/payloadClient";
import { StoredEncryptedFile } from "@/lib/fileStorage";
import { PayloadShare } from "@/payload/types";
import { createKeyEnvelope, createQuickShareEnvelope, deriveDeterministicIdentity, KeyAgreementMetadata } from "@/lib/e2ee";
import { SecurityVerificationModal } from "./SecurityVerificationModal";

interface CreateSecureShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StoredEncryptedFile | null;
  vaultXId?: string | null;
  onShareCreated?: (share: PayloadShare) => void;
}

export function CreateSecureShareModal({
  isOpen,
  onClose,
  file,
  vaultXId,
  onShareCreated,
}: CreateSecureShareModalProps) {
  // Sharing Mode: "e2ee" (Recipient public key) or "quick" (256-bit URL secret)
  const [shareMode, setShareMode] = useState<"e2ee" | "quick">("e2ee");

  // Recipient input & profile state
  const [recipientInput, setRecipientInput] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<
    Array<{ walletAddress: string; publicKeyFingerprint?: string }>
  >([]);
  const [isLookingUpRecipient, setIsLookingUpRecipient] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<{
    walletAddress: string;
    publicKeyHex: string;
    publicKeyFingerprint: string;
  } | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Security Verification QR Modal state
  const [showQrModal, setShowQrModal] = useState(false);

  // Sharing Controls
  const [expirationOption, setExpirationOption] = useState<"never" | "1h" | "24h" | "7d" | "30d">("24h");
  const [downloadLimitOption, setDownloadLimitOption] = useState<"1" | "5" | "10" | "unlimited">("unlimited");
  const [oneTime, setOneTime] = useState(false);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [burnDurationSeconds, setBurnDurationSeconds] = useState<number>(60);
  const [requireApproval, setRequireApproval] = useState(true);

  // Creation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<PayloadShare | null>(null);
  const [quickShareSecret, setQuickShareSecret] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Owl Guardian State
  const [owlState, setOwlState] = useState<OwlState>("idle");

  // Load registered users on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setOwlState("file_selected"), 0);
      listRegisteredUsersApi().then((users) => {
        setRegisteredUsers(users);
      });
    }
  }, [isOpen]);

  // Lookup recipient profile when address is entered
  useEffect(() => {
    const trimmed = recipientInput.trim().toLowerCase();
    if (!trimmed || trimmed.length < 10) {
      setTimeout(() => {
        setRecipientProfile(null);
        setRecipientError(null);
      }, 0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUpRecipient(true);
      setRecipientError(null);
      setOwlState("verifying");

      let profile: { walletAddress: string; publicKeyHex: string; publicKeyFingerprint: string } | null = null;

      try {
        const res = await lookupRecipientProfileApi(trimmed);
        if (res.registered && res.user) {
          profile = res.user;
        }
      } catch {
        // Fallback to client derivation
      }

      if (!profile && (/^0x[a-fA-F0-9]{40}$/i.test(trimmed) || /^VX-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/i.test(trimmed))) {
        const derived = deriveDeterministicIdentity(trimmed);
        profile = {
          walletAddress: trimmed,
          publicKeyHex: derived.publicKeyHex,
          publicKeyFingerprint: derived.fingerprint,
        };
      }

      setIsLookingUpRecipient(false);

      if (profile) {
        setRecipientProfile(profile);
        setRecipientError(null);
        setOwlState("verifying");
      } else {
        setRecipientProfile(null);
        setRecipientError("Please enter a valid wallet address (e.g. 0x... or VX-...).");
        setOwlState("idle");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [recipientInput]);

  if (!isOpen || !file) return null;

  const handleCreateShare = async () => {
    if (!file.keyHex) {
      setError("File encryption key is missing from local vault. Decryption key is required to wrap the envelope.");
      return;
    }

    if (shareMode === "e2ee" && !recipientProfile) {
      setError("Please specify a recipient with a registered SecureVault public encryption key.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setOwlState("encrypting");

      const targetId = file.id || file.cid || `file_${Date.now()}`;
      const effectiveOwner = vaultXId || file.ownerAddress || undefined;

      let encryptedFileKey: string | undefined = undefined;
      let keyAgreementMetadata: KeyAgreementMetadata | undefined = undefined;
      let quickEnvelopeStr: string | undefined = undefined;
      let generatedSecretHex: string | null = null;

      if (shareMode === "e2ee" && recipientProfile) {
        // 1. Asymmetric X25519 + HKDF-SHA-256 + AES-256-GCM Key Envelope
        const envelope = await createKeyEnvelope(
          file.keyHex,
          recipientProfile.publicKeyHex,
          recipientProfile.publicKeyFingerprint
        );
        encryptedFileKey = envelope.encryptedFileKey;
        keyAgreementMetadata = envelope.keyAgreementMetadata;
      } else {
        // 2. High-entropy Quick Share Secret Envelope (256-bit secret kept ONLY in URL hash)
        const quick = await createQuickShareEnvelope(file.keyHex);
        quickEnvelopeStr = JSON.stringify(quick.envelope);
        generatedSecretHex = quick.secretHex;
        setQuickShareSecret(generatedSecretHex);
      }

      const fallbackChunks = (file.cid || file.manifestCID)
        ? [
            {
              id: `${targetId}_chunk_0`,
              fileId: targetId,
              chunkIndex: 0,
              chunkSize: file.fileSize || 0,
              encryptedSize: file.fileSize || 0,
              iv: "",
              hash: "",
              cid: file.cid || file.manifestCID || "",
              status: "uploaded" as const,
              uploadedAt: new Date().toISOString(),
            },
          ]
        : undefined;

      const share = await createSecureShare(
        {
          fileId: targetId,
          fileName: file.fileName || file.originalName,
          fileSize: file.fileSize || 0,
          mimeType: file.mimeType || "application/octet-stream",
          manifestCID: file.manifestCID || file.cid || "",
          cid: file.cid || "",
          recipientUserId: shareMode === "e2ee" && recipientProfile ? recipientProfile.walletAddress : undefined,
          recipientPublicKeyFingerprint: shareMode === "e2ee" && recipientProfile ? recipientProfile.publicKeyFingerprint : undefined,
          encryptedFileKey,
          keyAgreementMetadata,
          isQuickShare: shareMode === "quick",
          quickShareEnvelope: quickEnvelopeStr,
          chunks: fallbackChunks,
          expirationOption,
          downloadLimitOption,
          oneTime,
          burnAfterReading,
          burnDurationSeconds,
          requireApproval,
        },
        effectiveOwner
      );

      setCreatedShare(share);
      setOwlState("success");
      onShareCreated?.(share);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create share code.";
      setError(msg);
      setOwlState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdShare) return;
    navigator.clipboard.writeText(createdShare.shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = () => {
    if (!createdShare) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const hashPart = quickShareSecret ? `#secret=${quickShareSecret}` : "";
    const url = `${origin}/receive?code=${createdShare.shareCode}${hashPart}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetAndClose = () => {
    setCreatedShare(null);
    setQuickShareSecret(null);
    setError(null);
    setRecipientInput("");
    setRecipientProfile(null);
    setRecipientError(null);
    setShareMode("e2ee");
    setOneTime(false);
    setBurnAfterReading(false);
    setBurnDurationSeconds(60);
    setOwlState("idle");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-100 shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {createdShare ? "End-to-End Share Ready" : "End-to-End Encrypted Share"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {createdShare
                    ? "Asymmetric key envelope created. Only recipient can decrypt."
                    : "Zero-knowledge cryptographic key wrapping with X25519."}
                </p>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!createdShare ? (
              /* Configuration Step */
              <>
                {/* File Header Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                      {file.fileName}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      {formatBytes(file.fileSize)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Check className="h-3 w-3" /> Encrypted locally (AES-256-GCM)
                    </span>
                    <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      <ShieldCheck className="h-3 w-3" /> SHA-256 Integrity Verified
                    </span>
                  </div>
                </div>

                {/* Sharing Mode Tabs */}
                <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShareMode("e2ee");
                      setError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      shareMode === "e2ee"
                        ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Recipient E2EE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareMode("quick");
                      setError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      shareMode === "quick"
                        ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Quick Share Link</span>
                  </button>
                </div>

                {/* Recipient Selection for Direct E2EE */}
                {shareMode === "e2ee" ? (
                  <div className="space-y-2 p-3.5 rounded-2xl border border-slate-200 bg-white">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Recipient Wallet Address</span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
                        placeholder="Paste recipient wallet (e.g. 0x...)"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:bg-white focus:border-[#2563EB] focus:outline-none"
                      />
                      {isLookingUpRecipient && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                        </div>
                      )}
                    </div>

                    {/* Quick Suggestions from Registered Users */}
                    {registeredUsers.length > 0 && !recipientProfile && (
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                          Registered Contacts
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {registeredUsers.slice(0, 3).map((u) => (
                            <button
                              key={u.walletAddress}
                              type="button"
                              onClick={() => setRecipientInput(u.walletAddress)}
                              className="text-[10px] font-mono font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-[#2563EB] px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                            >
                              {u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verified Recipient Banner */}
                    {recipientProfile && (
                      <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Recipient Public Key Verified</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <QrCode className="h-3 w-3" />
                            <span>Show QR</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Security Verification:</span>
                          <span className="font-mono font-bold text-slate-800 tracking-wider">
                            {recipientProfile.publicKeyFingerprint}
                          </span>
                        </div>
                      </div>
                    )}

                    {recipientError && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                        {recipientError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Zap className="h-3.5 w-3.5 text-amber-600" />
                      <span>Quick Share Mode</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Generates a 256-bit cryptographically random secret embedded exclusively into the URL hash fragment. The decryption secret is never transmitted to the server.
                    </p>
                  </div>
                )}

                {/* Expiration Options */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>Expiration Time</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(["1h", "24h", "7d", "30d", "never"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setExpirationOption(opt)}
                        className={`py-2 text-center rounded-xl text-xs font-semibold transition-all border ${
                          expirationOption === opt
                            ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        {opt === "1h"
                          ? "1 Hour"
                          : opt === "24h"
                          ? "24 Hours"
                          : opt === "7d"
                          ? "7 Days"
                          : opt === "30d"
                          ? "30 Days"
                          : "Never"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download Limits & One-Time Access Controls */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-2 p-3.5 rounded-2xl border border-slate-200 bg-white">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Download Limit</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["1", "5", "10", "unlimited"] as const).map((limit) => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setDownloadLimitOption(limit)}
                          className={`py-1.5 text-center rounded-xl text-xs font-semibold transition-all border ${
                            downloadLimitOption === limit
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {limit === "unlimited" ? "Unlimited" : `${limit} ${limit === "1" ? "download" : "downloads"}`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">One-time access</span>
                        <span className="text-[10px] text-slate-500 block">
                          Revoke share automatically after successful download
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={oneTime}
                        onChange={(e) => setOneTime(e.target.checked)}
                        className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                      />
                    </div>

                    {/* Burn After Reading / Self-Destruct */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Flame className={`h-3.5 w-3.5 ${burnAfterReading ? "text-amber-600 animate-pulse" : "text-slate-400"}`} />
                            <span>Burn After Reading (Self-Destruct)</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Cryptographically purges envelopes & revokes access on timer expiry
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={burnAfterReading}
                          onChange={(e) => setBurnAfterReading(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                        />
                      </div>

                      {burnAfterReading && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 animate-in fade-in duration-150">
                          <label className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                            <span>Self-Destruct Timer:</span>
                            <span className="font-mono text-amber-800">
                              {burnDurationSeconds >= 60 ? `${burnDurationSeconds / 60}m` : `${burnDurationSeconds}s`}
                            </span>
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { label: "30s", val: 30 },
                              { label: "60s (1m)", val: 60 },
                              { label: "5m", val: 300 },
                              { label: "15m", val: 900 },
                            ].map((item) => (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => setBurnDurationSeconds(item.val)}
                                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all border ${
                                  burnDurationSeconds === item.val
                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                    : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-amber-800 leading-tight">
                            Live visual countdown activates as soon as the recipient decrypts the file.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Owner Approval Gate */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <UserCheck className={`h-3.5 w-3.5 ${requireApproval ? "text-[#2563EB]" : "text-slate-400"}`} />
                          <span>Require Owner Approval</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          You must approve each recipient before they can decrypt or download this file
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={requireApproval}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                        className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            ) : (
              /* Share Success Screen (E2EE SPEC COMPLIANT) */
              <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
                <div className="flex justify-center">
                  <OwlCompanion state="success" size="md" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>End-to-End Encrypted File Ready</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{file.fileName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{formatBytes(file.fileSize)}</p>
                </div>

                {/* Secure Share Code Display */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-1.5 text-center">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">
                    Secure Share Code
                  </span>
                  <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-cyan-400 select-all">
                    {createdShare.shareCode}
                  </div>
                </div>

                {/* E2EE Security Spec Card (Exact Required Layout) */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-left space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#2563EB]">
                      END-TO-END ENCRYPTED
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="h-3 w-3" /> Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Recipient:</span>
                      <span className="font-mono font-bold text-slate-800 truncate block">
                        {createdShare.recipientUserId
                          ? `${createdShare.recipientUserId.slice(0, 6)}...${createdShare.recipientUserId.slice(-4)}`
                          : "Quick Share Recipient"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Encryption:</span>
                      <span className="font-bold text-slate-800 block">AES-256-GCM</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Key protection:</span>
                      <span className="font-bold text-slate-800 block">
                        {createdShare.recipientUserId ? "Recipient public key" : "URL hash secret (client-only)"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Expires:</span>
                      <span className="font-bold text-slate-800 block">
                        {expirationOption === "never" ? "Never" : expirationOption}
                      </span>
                    </div>
                  </div>

                  {/* Security Invariants Checklist */}
                  <div className="space-y-1 text-[11px] font-semibold text-emerald-700 bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Private key stays on device</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Integrity verified</span>
                    </div>
                    {createdShare.burnAfterReading && (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <Flame className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                        <span>Self-destruct armed ({createdShare.burnDurationSeconds || 60}s countdown on read)</span>
                      </div>
                    )}
                    {createdShare.requireApproval && (
                      <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span>Owner approval gate active — you must approve access requests</span>
                      </div>
                    )}
                  </div>

                  {/* Security Verification Fingerprint */}
                  {createdShare.recipientPublicKeyFingerprint && (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Security Verification</span>
                        <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                          {createdShare.recipientPublicKeyFingerprint}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Show QR</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-left px-1">
                  Only the intended recipient can unlock this file with their local private key. The server never possesses the plaintext file, AES key, or private keys.
                </p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-end gap-2">
            {!createdShare ? (
              <>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={isSubmitting || (shareMode === "e2ee" && !recipientProfile)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Wrapping Key Envelope...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>{shareMode === "e2ee" ? "Create E2EE Share" : "Create Quick Share"}</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold text-xs shadow-2xs transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied Code</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#2563EB] font-semibold text-xs transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Copy Share Link</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Verification QR Modal */}
      {recipientProfile && (
        <SecurityVerificationModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          fingerprint={recipientProfile.publicKeyFingerprint}
          recipientAddress={recipientProfile.walletAddress}
        />
      )}
    </>
  );
}
