import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VaultTabs } from "@/components/vault/VaultTabs";
import { Shield, Lock, Upload, Download, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "Encrypted Vault | CYBER-10 Decentralized Storage",
  description:
    "Upload files encrypted client-side with AES-256-GCM to IPFS via Pinata. Only ciphertext leaves your device.",
};

const SECURITY_POINTS = [
  {
    icon: Lock,
    color: "cyan",
    title: "Client-Side Encryption",
    body: "Files are encrypted with AES-256-GCM in your browser before any data is sent.",
  },
  {
    icon: Upload,
    color: "violet",
    title: "Ciphertext Only",
    body: "Only the encrypted bundle reaches the server and Pinata. Plaintext never leaves your device.",
  },
  {
    icon: Shield,
    color: "emerald",
    title: "Key Sovereignty",
    body: "Your AES key is generated locally and never transmitted. CYBER-10 cannot decrypt your files.",
  },
  {
    icon: Download,
    color: "amber",
    title: "Verified Decryption",
    body: "GCM authentication tags verify file integrity on decryption. Tampered ciphertext is rejected.",
  },
];

const TECH_SPECS = [
  { label: "Encryption", value: "AES-256-GCM" },
  { label: "IPFS Provider", value: "Pinata" },
  { label: "Key Transit", value: "Never sent" },
  { label: "Plaintext Transit", value: "Never sent" },
  { label: "Decryption", value: "Browser only" },
  { label: "Auth", value: "SIWE Session" },
];

export default function VaultPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/60 to-violet-950/60 shadow-lg shadow-cyan-500/10">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
                Encrypted Vault
              </h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                Phase 4 · AES-256-GCM → IPFS via Pinata · Zero-Knowledge
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
            Encrypt any file locally in your browser, then store the ciphertext permanently on IPFS.
            Your plaintext and encryption key never leave your device.
          </p>
        </div>

        {/* Crypto spec bar */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Security Spec
              </span>
            </div>
            {TECH_SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">{label}:</span>
                <span className="text-[10px] font-mono font-semibold text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security cards */}
        <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SECURITY_POINTS.map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className={`rounded-xl border p-3.5 ${
                color === "cyan"
                  ? "border-cyan-500/20 bg-cyan-950/10"
                  : color === "violet"
                  ? "border-violet-500/20 bg-violet-950/10"
                  : color === "emerald"
                  ? "border-emerald-500/20 bg-emerald-950/10"
                  : "border-amber-500/20 bg-amber-950/10"
              }`}
            >
              <Icon
                className={`mb-2 h-4 w-4 ${
                  color === "cyan"
                    ? "text-cyan-400"
                    : color === "violet"
                    ? "text-violet-400"
                    : color === "emerald"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              />
              <p className={`text-xs font-semibold mb-0.5 ${
                color === "cyan"
                  ? "text-cyan-300"
                  : color === "violet"
                  ? "text-violet-300"
                  : color === "emerald"
                  ? "text-emerald-300"
                  : "text-amber-300"
              }`}>
                {title}
              </p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Main tab panel */}
        <VaultTabs />

        <p className="mt-8 text-center text-[11px] text-zinc-600 font-mono">
          Phase 4 · IPFS via Pinata · Supabase metadata storage available in Phase 5
        </p>
      </div>
    </ProtectedRoute>
  );
}
