import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FileEncryptionPanel } from "@/components/encryption/FileEncryptionPanel";
import { ShieldCheck, Lock, Cpu, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Secure a File | SecureVault",
  description:
    "Client-side AES-256-GCM file encryption. Your files are encrypted locally in the browser — zero server custody, zero key exposure.",
};

const TECH_SPECS = [
  { label: "Algorithm", value: "AES-256-GCM" },
  { label: "Key Size", value: "256 bits" },
  { label: "IV / Nonce", value: "96-bit random" },
  { label: "Auth Tag", value: "128-bit GCM" },
  { label: "Key Derivation", value: "Web Crypto API" },
  { label: "Server Uploads", value: "Zero (Local Browser)" },
];

export default function EncryptPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Header (Screen 5) */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
                Upload a File
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Your file is encrypted on this device before upload.
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-slate-600 leading-relaxed pt-1">
            Encrypt or decrypt any file directly in your browser using AES-256-GCM authenticated
            encryption. Plaintext never leaves your machine — all cryptographic operations are executed locally.
          </p>
        </div>

        {/* Cryptographic Spec Bar */}
        <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 shrink-0">
              <Cpu className="h-4 w-4 text-[#2563EB]" />
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Security Spec
              </span>
            </div>
            {TECH_SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  {label}:
                </span>
                <span className="text-[11px] font-semibold text-slate-800">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Guarantee Strip */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: ShieldCheck,
              color: "emerald",
              title: "Encrypted locally",
              body: "Your file is encrypted in your browser before upload. Zero server custody.",
            },
            {
              icon: Lock,
              color: "blue",
              title: "AES-256-GCM encryption",
              body: "Authenticated encryption guarantees both confidentiality and tamper integrity.",
            },
            {
              icon: KeyRound,
              color: "purple",
              title: "Integrity protected (SHA-256)",
              body: "Cryptographic hash ensures your file data is reconstructed bit-for-bit intact.",
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                    color === "emerald"
                      ? "bg-emerald-50 text-emerald-600"
                      : color === "blue"
                      ? "bg-blue-50 text-[#2563EB]"
                      : "bg-purple-50 text-purple-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Encryption Panel */}
        <FileEncryptionPanel />

        {/* Reassurance Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          SecureVault Runtime · WebCrypto Hardware Acceleration · Plaintext never leaves your device.
        </p>
      </div>
    </ProtectedRoute>
  );
}