"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Copy, Check, QrCode } from "lucide-react";
import QRCode from "qrcode";

interface SecurityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fingerprint: string;
  recipientAddress: string;
  recipientName?: string;
}

export function SecurityVerificationModal({
  isOpen,
  onClose,
  fingerprint,
  recipientAddress,
  recipientName,
}: SecurityVerificationModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fingerprint) return;

    // Generate QR code data URL representing the security fingerprint verification string
    const verificationPayload = JSON.stringify({
      type: "securevault-security-fingerprint",
      recipient: recipientAddress,
      fingerprint,
    });

    QRCode.toDataURL(verificationPayload, {
      width: 240,
      margin: 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url: string) => setQrDataUrl(url))
      .catch((err: unknown) => console.warn("Failed to generate verification QR:", err));
  }, [isOpen, fingerprint, recipientAddress]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split fingerprint into rows for clean display
  const parts = fingerprint.split(" ");
  const row1 = parts.slice(0, 2).join(" ");
  const row2 = parts.slice(2, 4).join(" ");
  const row3 = parts.slice(4, 6).join(" ");

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Security Verification</h4>
              <p className="text-[10px] text-slate-500 font-mono">
                {recipientName || `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Security Fingerprint QR"
              className="h-44 w-44 rounded-xl shadow-2xs border border-slate-200"
            />
          ) : (
            <div className="h-44 w-44 flex items-center justify-center text-slate-400">
              <QrCode className="h-10 w-10 animate-pulse" />
            </div>
          )}
        </div>

        {/* Fingerprint Number Blocks */}
        <div className="text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Cryptographic Safety Number
          </span>
          <div className="font-mono text-base font-bold text-slate-800 tracking-widest bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200">
            <div>{row1}</div>
            <div>{row2}</div>
            <div>{row3}</div>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Compare this safety number or scan the QR code with the recipient over a trusted communication channel (e.g. Signal, in person) to verify end-to-end encryption.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied Number</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Safety Number</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
