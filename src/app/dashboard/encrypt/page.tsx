import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FileEncryptionPanel } from "@/components/encryption/FileEncryptionPanel";
import { ShieldCheck, Lock, Cpu, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Encrypt & Decrypt | VaultX Sovereign Vault",
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
        {/* Page Header */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3B4046] bg-[#1E2024] text-[#F6851B] shadow-inner">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F2F4F6] font-mono tracking-tight">
                Client-Side File Encryption
              </h1>
              <p className="text-xs text-[#848C96] font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F6851B] animate-pulse" />
                MetaMask Sovereign AES-256-GCM · Zero-Knowledge
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-[#848C96] leading-relaxed">
            Encrypt or decrypt any file directly in your browser using AES-256-GCM authenticated
            encryption. Your plaintext file never leaves your device — all cryptographic operations
            are executed locally in-memory via the{" "}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F6851B] hover:text-[#E2761B] underline underline-offset-2 font-medium"
            >
              Web Crypto API
            </a>
            .
          </p>
        </div>

        {/* Cryptographic Spec Bar */}
        <div className="mb-8 rounded-2xl border border-[#3B4046] bg-[#1E2024] px-5 py-3.5 shadow-md shadow-black/20">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 shrink-0">
              <Cpu className="h-4 w-4 text-[#F6851B]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#848C96] font-semibold">
                Crypto Spec
              </span>
            </div>
            {TECH_SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[#848C96] font-mono">
                  {label}:
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#F2F4F6]">
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
              title: "Zero Server Custody",
              body: "Encrypted data is computed locally. No plaintext file contents are ever sent to external servers.",
            },
            {
              icon: Lock,
              color: "orange",
              title: "Authenticated Encryption",
              body: "AES-256-GCM provides both confidentiality and tamper integrity. Altered ciphertext fails decryption.",
            },
            {
              icon: KeyRound,
              color: "blue",
              title: "You Control the Keys",
              body: "Keys are generated ephemerally in your browser and never stored. Always backup your key.",
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className={`rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
                color === "emerald"
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : color === "orange"
                  ? "border-[#F6851B]/35 bg-[#F6851B]/10"
                  : "border-[#037DD6]/35 bg-[#037DD6]/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-1.5 rounded-lg border shrink-0 ${
                    color === "emerald"
                      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                      : color === "orange"
                      ? "border-[#F6851B]/40 bg-[#1E2024] text-[#F6851B]"
                      : "border-[#037DD6]/40 bg-[#1E2024] text-[#037DD6]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      color === "emerald"
                        ? "text-emerald-300"
                        : color === "orange"
                        ? "text-[#F6851B]"
                        : "text-[#038FF0]"
                    }`}
                  >
                    {title}
                  </p>
                  <p className="mt-1 text-xs text-[#848C96] leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Encryption Panel */}
        <FileEncryptionPanel />

        {/* Footer Note */}
        <p className="mt-8 text-center text-[11px] text-[#848C96] font-mono">
          VaultX Sovereign Runtime · Browser Hardware Acceleration · Zero Server Key Transit
        </p>
      </div>
    </ProtectedRoute>
  );
}