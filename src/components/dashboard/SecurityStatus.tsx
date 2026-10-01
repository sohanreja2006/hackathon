"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Lock, Key, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useVaultXWallet } from "@/context/VaultXWalletContext";

export function SecurityStatus() {
  const { isConnected, address } = useAccount();
  const { isConnected: isVaultXConnected, identity: vaultXIdentity } = useVaultXWallet();
  const [subtleReady, setSubtleReady] = useState(false);

  useEffect(() => {
    setSubtleReady(typeof window !== "undefined" && !!window.crypto?.subtle);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Entropy & WebCrypto */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Local Entropy Engine
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
            <Cpu className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-bold text-slate-900">
            {subtleReady ? "WebCrypto SubtleAPI Active" : "CSPRNG Standby"}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Cryptographically secure pseudorandom numbers (CSPRNG) initialized.
        </p>
      </div>

      {/* Encryption Cipher */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Default Cipher
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Lock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1.5">
          AES-256-GCM (Authenticated)
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Galois/Counter Mode guarantees payload confidentiality and 128-bit integrity.
        </p>
      </div>

      {/* Key Custody */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Custody Architecture
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Key className="h-4 w-4" />
          </div>
        </div>
        <div className="text-sm font-bold text-[#2563EB]">
          Non-Custodial / Sovereign
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {isVaultXConnected && vaultXIdentity
            ? `Bound to local wallet ${vaultXIdentity.id}. Keys never leave browser.`
            : isConnected && address
            ? `Bound to ${address.slice(0, 6)}...${address.slice(-4)}. Keys never leave browser.`
            : "Zero server key exposure. Decryption keys never leave your browser."}
        </p>
      </div>
    </div>
  );
}
