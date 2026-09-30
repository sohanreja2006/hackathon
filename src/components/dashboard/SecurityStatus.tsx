"use client";

import React from "react";
import { Cpu, Lock, Key } from "lucide-react";

export function SecurityStatus() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Entropy & WebCrypto */}
      <div className="rounded-2xl border border-[#3b4046] bg-[#1e2024] p-4 backdrop-blur-md shadow-md shadow-black/20 hover:border-[#f6851b]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-[#848c96] font-semibold">
            Local Entropy Engine
          </span>
          <Cpu className="h-4 w-4 text-[#f6851b]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-semibold text-[#f2f4f6]">
            WebCrypto SubtleAPI Active
          </span>
        </div>
        <p className="text-[11px] text-[#848c96] mt-1">
          Cryptographically secure pseudorandom numbers (CSPRNG) ready.
        </p>
      </div>

      {/* Encryption Cipher */}
      <div className="rounded-2xl border border-[#3b4046] bg-[#1e2024] p-4 backdrop-blur-md shadow-md shadow-black/20 hover:border-[#f6851b]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-[#848c96] font-semibold">
            Default Cipher
          </span>
          <Lock className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-sm font-semibold text-[#f2f4f6] font-mono">
          AES-GCM-256 (Authenticated)
        </div>
        <p className="text-[11px] text-[#848c96] mt-1">
          Galois/Counter Mode guarantees integrity and confidentiality.
        </p>
      </div>

      {/* Key Custody */}
      <div className="rounded-2xl border border-[#3b4046] bg-[#1e2024] p-4 backdrop-blur-md shadow-md shadow-black/20 hover:border-[#f6851b]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-[#848c96] font-semibold">
            Custody Architecture
          </span>
          <Key className="h-4 w-4 text-[#037dd6]" />
        </div>
        <div className="text-sm font-semibold text-[#038ff0]">
          Non-Custodial / Sovereign
        </div>
        <p className="text-[11px] text-[#848c96] mt-1">
          Zero server key exposure. Decryption keys never leave your browser.
        </p>
      </div>
    </div>
  );
}
