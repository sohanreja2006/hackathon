import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FileEncryptionPanel } from "@/components/encryption/FileEncryptionPanel";
import { ShieldCheck, Lock, Cpu, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Encrypt & Decrypt | CYBER-10 Secure Vault",
  description:
    "Client-side AES-256-GCM file encryption. Your files are encrypted locally in the browser — zero server custody, zero key exposure.",
};

const TECH_SPECS = [
  { label: "Algorithm", value: "AES-256-GCM" },
  { label: "Key Size", value: "256 bits" },
  { label: "IV / Nonce", value: "96-bit random" },
  { label: "Auth Tag", value: "128-bit GCM" },
  { label: "Key Derivation", value: "Web Crypto API" },
  { label: "Server Uploads", value: "None (Phase 3)" },
];

export default function EncryptPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/30">
              <Lock className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 font-mono tracking-tight">
                Client-Side File Encryption
              </h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                Phase 3 · AES-256-GCM · Zero-Knowledge
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
            Encrypt or decrypt any file directly in your browser using AES-256-GCM authenticated
            encryption. Your plaintext file never leaves your device — all cryptographic operations
            are performed locally via the{" "}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              Web Crypto API
            </a>
            .
          </p>
        </div>

        {/* Cryptographic Spec Bar */}
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Crypto Spec
              </span>
            </div>
            {TECH_SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">
                  {label}:
                </span>
                <span className="text-[10px] font-mono font-semibold text-zinc-300">
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
              body: "Encrypted data is computed locally. No file contents are ever sent to CYBER-10 servers.",
            },
            {
              icon: Lock,
              color: "cyan",
              title: "Authenticated Encryption",
              body: "GCM mode provides both confidentiality and integrity. Tampered ciphertext cannot be decrypted.",
            },
            {
              icon: AlertTriangle,
              color: "amber",
              title: "You Control the Keys",
              body: "Keys are generated ephemerally in your browser and never stored. Save your key after encryption.",
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className={`rounded-xl border p-4 ${
                color === "emerald"
                  ? "border-emerald-500/20 bg-emerald-950/10"
                  : color === "cyan"
                  ? "border-cyan-500/20 bg-cyan-950/10"
                  : "border-amber-500/20 bg-amber-950/10"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    color === "emerald"
                      ? "text-emerald-400"
                      : color === "cyan"
                      ? "text-cyan-400"
                      : "text-amber-400"
                  }`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      color === "emerald"
                        ? "text-emerald-300"
                        : color === "cyan"
                        ? "text-cyan-300"
                        : "text-amber-300"
                    }`}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Encryption Panel */}
        <FileEncryptionPanel />

        {/* Footer Note */}
        <p className="mt-8 text-center text-[11px] text-zinc-600 font-mono">
          Phase 3 · In-browser only · IPFS pinning available in Phase 4
        </p>
      </div>
    </ProtectedRoute>
  );
}
