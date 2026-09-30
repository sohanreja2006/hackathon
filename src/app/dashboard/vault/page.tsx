import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VaultTabs } from "@/components/vault/VaultTabs";
import { Shield, Lock, Upload, Download, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "Encrypted Vault | SecureVault",
  description:
    "Upload files encrypted client-side with AES-256-GCM to IPFS via Pinata. Only ciphertext leaves your device.",
};

const SECURITY_POINTS = [
  {
    icon: Lock,
    color: "blue",
    title: "Client-Side Encryption",
    body: "Files are encrypted with AES-256-GCM directly in your browser before any network dispatch.",
  },
  {
    icon: Upload,
    color: "purple",
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
  { label: "Authentication", value: "EIP-4361 SIWE" },
];

export default function VaultPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
                Encrypted Vault
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Decentralized IPFS Storage · Zero-Knowledge
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-slate-600 leading-relaxed pt-1">
            Encrypt any file locally in your browser, then pin the ciphertext to IPFS.
            Your plaintext data and private encryption keys never touch centralized servers.
          </p>
        </div>

        {/* Crypto spec bar */}
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
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}:</span>
                <span className="text-[11px] font-semibold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SECURITY_POINTS.map(({ icon: Icon, color, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
            >
              <div
                className={`mb-2.5 inline-flex p-2 rounded-xl ${
                  color === "blue"
                    ? "bg-blue-50 text-[#2563EB]"
                    : color === "purple"
                    ? "bg-purple-50 text-purple-600"
                    : color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 mb-1">
                {title}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Main tab panel */}
        <VaultTabs />

        <p className="mt-8 text-center text-xs text-slate-400">
          SecureVault Pipeline · Decentralized IPFS Storage · Cryptographic Key Sovereignty
        </p>
      </div>
    </ProtectedRoute>
  );
}
