import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VaultTabs } from "@/components/vault/VaultTabs";
import { Shield, Lock, Upload, Download, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "Encrypted Vault | VaultX Decentralized Storage",
  description:
    "Upload files encrypted client-side with AES-256-GCM to IPFS via Pinata. Only ciphertext leaves your device.",
};

const SECURITY_POINTS = [
  {
    icon: Lock,
    color: "orange",
    title: "Client-Side Encryption",
    body: "Files are encrypted with AES-256-GCM directly in your browser before any network dispatch.",
  },
  {
    icon: Upload,
    color: "blue",
    title: "Ciphertext Only",
    body: "Only the encrypted payload reaches IPFS nodes. Plaintext never leaves your machine.",
  },
  {
    icon: Shield,
    color: "emerald",
    title: "Key Sovereignty",
    body: "Your AES key is generated locally and never transmitted. Zero vendor access or custody.",
  },
  {
    icon: Download,
    color: "amber",
    title: "Verified Decryption",
    body: "GCM 128-bit authentication tags verify payload integrity on decryption. Tampered files are rejected.",
  },
];

const TECH_SPECS = [
  { label: "Encryption", value: "AES-256-GCM" },
  { label: "IPFS Network", value: "Pinata P2P Swarm" },
  { label: "Key Transit", value: "0 bytes transmitted" },
  { label: "Plaintext Transit", value: "0 bytes transmitted" },
  { label: "Decryption", value: "Browser WebCrypto" },
  { label: "Authentication", value: "MetaMask SIWE" },
];

export default function VaultPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3B4046] bg-[#1E2024] text-[#F6851B] shadow-inner">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F2F4F6] font-mono tracking-tight">
                Encrypted Vault
              </h1>
              <p className="text-xs text-[#848C96] font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F6851B] animate-pulse" />
                MetaMask Sovereign Web3 Vault · IPFS Swarm · Zero-Knowledge
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-[#848C96] leading-relaxed">
            Encrypt any file locally in your browser, then pin the ciphertext permanently to IPFS.
            Your plaintext data and private encryption keys never touch centralized servers.
          </p>
        </div>

        {/* Crypto spec bar */}
        <div className="mb-6 rounded-2xl border border-[#3B4046] bg-[#1E2024] px-5 py-3.5 shadow-md shadow-black/20">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 shrink-0">
              <Cpu className="h-4 w-4 text-[#F6851B]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#848C96] font-semibold">
                Security Spec
              </span>
            </div>
            {TECH_SPECS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[#848C96] font-mono">{label}:</span>
                <span className="text-[11px] font-mono font-semibold text-[#F2F4F6]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SECURITY_POINTS.map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className={`rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
                color === "orange"
                  ? "border-[#F6851B]/35 bg-[#F6851B]/10"
                  : color === "blue"
                  ? "border-[#037DD6]/35 bg-[#037DD6]/10"
                  : color === "emerald"
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-amber-500/30 bg-amber-950/20"
              }`}
            >
              <div
                className={`mb-2.5 inline-flex p-1.5 rounded-lg border ${
                  color === "orange"
                    ? "border-[#F6851B]/40 bg-[#1E2024] text-[#F6851B]"
                    : color === "blue"
                    ? "border-[#037DD6]/40 bg-[#1E2024] text-[#037DD6]"
                    : color === "emerald"
                    ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                    : "border-amber-500/30 bg-amber-950/40 text-amber-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p
                className={`text-xs font-semibold mb-1 ${
                  color === "orange"
                    ? "text-[#F6851B]"
                    : color === "blue"
                    ? "text-[#038FF0]"
                    : color === "emerald"
                    ? "text-emerald-300"
                    : "text-amber-300"
                }`}
              >
                {title}
              </p>
              <p className="text-[11px] text-[#848C96] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Main tab panel */}
        <VaultTabs />

        <p className="mt-8 text-center text-[11px] text-[#848C96] font-mono">
          VaultX Sovereign Pipeline · Decentralized IPFS Storage · Cryptographic Key Sovereignty
        </p>
      </div>
    </ProtectedRoute>
  );
}
