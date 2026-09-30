"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { formatBytes } from "@/lib/crypto";
import { OwlCompanion } from "@/components/ui/OwlCompanion";
import { createSecureShare } from "@/lib/payloadClient";
import { StoredEncryptedFile } from "@/lib/fileStorage";
import { PayloadShare } from "@/payload/types";

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
  // Config state
  const [expirationOption, setExpirationOption] = useState<"never" | "1h" | "24h" | "7d" | "30d">("24h");
  const [downloadLimitOption, setDownloadLimitOption] = useState<"1" | "5" | "10" | "unlimited">("1");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [oneTime, setOneTime] = useState(false);

  // Flow & creation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<PayloadShare | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !file) return null;

  const handleCreateShare = async () => {
    if (!file.id) {
      setError("This file does not have a registered backend ID. Please re-upload or select a synced vault file.");
      return;
    }

    if (passwordProtected && !password.trim()) {
      setError("Please enter a password or disable password protection.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const share = await createSecureShare(
        {
          fileId: file.id,
          expirationOption,
          downloadLimitOption: oneTime ? "1" : downloadLimitOption,
          oneTime,
          passwordProtected,
          password: password.trim(),
        },
        vaultXId
      );

      setCreatedShare(share);
      onShareCreated?.(share);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create share code.";
      setError(msg);
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
    const url = `${origin}/receive?code=${createdShare.shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetAndClose = () => {
    setCreatedShare(null);
    setError(null);
    setPasswordProtected(false);
    setPassword("");
    setOneTime(false);
    onClose();
  };

  return (
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
                {createdShare ? "Share Ready" : "Create Secure Share"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {createdShare
                  ? "Share code generated with zero plaintext exposure"
                  : "Zero-knowledge share code pointing to encrypted IPFS chunks"}
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!createdShare ? (
            /* Creation Configuration Step */
            <>
              {/* File Info Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                    {file.fileName}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    {formatBytes(file.fileSize)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Check className="h-3 w-3" /> Encrypted (AES-256-GCM)
                  </span>
                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <ShieldCheck className="h-3 w-3" /> Integrity verified (SHA-256)
                  </span>
                  <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    <Lock className="h-3 w-3" /> Stored on IPFS
                  </span>
                </div>
              </div>

              {/* Owl Companion Reactive Guidance */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 flex items-center gap-3">
                <OwlCompanion state="verifying" size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900">Guardian Protected</div>
                  <p className="text-[11px] text-slate-600">
                    Your encryption key and original file never leave your local session. Only a temporary cryptographic pointer is shared.
                  </p>
                </div>
              </div>

              {/* Expiration Option */}
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

              {/* Download Limit Option */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Download className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>Download Limit</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["1", "5", "10", "unlimited"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={oneTime}
                      onClick={() => setDownloadLimitOption(opt)}
                      className={`py-2 text-center rounded-xl text-xs font-semibold transition-all border ${
                        oneTime
                          ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : downloadLimitOption === opt
                          ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      {opt === "unlimited" ? "Unlimited" : `${opt} download${opt === "1" ? "" : "s"}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Password Protection & One-Time Access */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* One-Time Access Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">One-time download</span>
                    <span className="text-[11px] text-slate-500 block">
                      Share automatically expires immediately after the first successful download
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => {
                      setOneTime(e.target.checked);
                      if (e.target.checked) setDownloadLimitOption("1");
                    }}
                    className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                </div>

                {/* Password Protection Toggle */}
                <div className="space-y-2 p-3 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Protect with password</span>
                      <span className="text-[11px] text-slate-500 block">
                        Require a password before the recipient can retrieve this file
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={passwordProtected}
                      onChange={(e) => setPasswordProtected(e.target.checked)}
                      className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  {passwordProtected && (
                    <div className="pt-2 animate-in fade-in duration-150 space-y-1">
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter a secure share password..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Password will be hashed using SHA-256 with salt. Plaintext is never stored.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            /* Share Success Screen */
            <div className="space-y-5 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="flex justify-center">
                <OwlCompanion state="success" size="md" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Your file is ready to share</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{file.fileName}</h3>
                <p className="text-xs text-slate-500 font-mono">{formatBytes(file.fileSize)}</p>
              </div>

              {/* Secure Share Code Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-2">
                <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold block">
                  Secure Share Code
                </span>
                <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-cyan-400 select-all">
                  {createdShare.shareCode}
                </div>
              </div>

              {/* Stats & Rules Overview */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <span className="text-[10px] text-slate-400 block font-medium">Expires:</span>
                  <span className="font-semibold text-slate-800">
                    {expirationOption === "never" ? "Never" : expirationOption}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <span className="text-[10px] text-slate-400 block font-medium">Downloads:</span>
                  <span className="font-semibold text-slate-800">
                    0 / {createdShare.maxDownloads !== null ? createdShare.maxDownloads : "∞"}
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 text-xs text-blue-900 flex items-center gap-2 text-left">
                <Shield className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span>
                  &ldquo;Only encrypted data is shared. Your original file remains encrypted.&rdquo;
                </span>
              </div>
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
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating Share Code...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Create Secure Share</span>
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
                      <span>Copy Link</span>
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
  );
}
