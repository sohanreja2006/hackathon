"use client";

import React from "react";
import Image from "next/image";
import Link from "next/image";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";

export function DashboardHeader() {
  const { address } = useAuthStatus();
  const { identity } = useVaultXWallet();

  const activeAddress = address || identity?.id;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-blue-50/20 to-white p-6 sm:p-8 mb-8 shadow-xs">
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
            Your vault is secure.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-lg leading-relaxed">
            Start securing your files with end-to-end privacy. Encrypted locally with AES-256-GCM before uploading to IPFS.
          </p>
        </div>

        {/* Owl Mascot with Shield */}
        <div className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0">
          <Image
            src="/images/owl-success.png"
            alt="SecureVault Guardian"
            fill
            priority
            className="object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
          />
        </div>
      </div>
    </div>
  );
}
