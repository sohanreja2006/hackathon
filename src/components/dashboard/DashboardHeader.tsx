"use client";

import React from "react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { OwlCompanion } from "@/components/ui/OwlCompanion";

export function DashboardHeader() {
  const { address } = useAuthStatus();
  const { isConnected: isVaultXConnected, identity } = useVaultXWallet();

  const activeAddress = address || (isVaultXConnected ? identity?.id : undefined);

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
          {activeAddress && (
            <p className="text-xs text-slate-400 font-mono">
              {activeAddress.substring(0, 6)}...{activeAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Animated Owl Guardian */}
        <div className="shrink-0 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full bg-emerald-100/50 blur-2xl scale-90 pointer-events-none" />
          <OwlCompanion
            state="success"
            size="lg"
            showSpeechBubble
            speechText="Your vault is secure."
            trackMouse
          />
        </div>
      </div>
    </div>
  );
}
