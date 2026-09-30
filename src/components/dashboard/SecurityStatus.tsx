"use client";

import React from "react";
import { Cpu, Lock, Key } from "lucide-react";

export function SecurityStatus() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Entropy & WebCrypto */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-zinc-400">
            Local Entropy Engine
          </span>
          <Cpu className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-semibold text-zinc-200">
            WebCrypto SubtleAPI Active
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Cryptographically secure pseudorandom numbers (CSPRNG) ready.
        </p>
      </div>

      {/* Encryption Cipher */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-zinc-400">
            Default Cipher
          </span>
          <Lock className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-sm font-semibold text-zinc-200 font-mono">
          AES-GCM-256 (Authenticated)
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Galois/Counter Mode guarantees integrity and confidentiality.
        </p>
      </div>

      {/* Key Custody */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase text-zinc-400">
            Custody Architecture
          </span>
          <Key className="h-4 w-4 text-purple-400" />
        </div>
        <div className="text-sm font-semibold text-purple-300">
          Non-Custodial / Sovereign
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Zero server key exposure. Decryption keys never transmitted.
        </p>
      </div>
    </div>
  );
}
