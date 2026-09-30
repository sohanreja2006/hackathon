"use client";

import React, { useState } from "react";
import { Copy, Check, LogOut, ShieldCheck, Lock, UploadCloud, Key } from "lucide-react";
import Link from "next/link";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { formatAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { address, chainName, disconnect, logout } = useAuthStatus();
  const { isConnected: isVaultXConnected, identity, openModal: openVaultXModal } = useVaultXWallet();
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeWalletAddress = address || identity?.id;

  const handleCopy = () => {
    if (!activeWalletAddress) return;
    navigator.clipboard.writeText(activeWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      disconnect();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#3b4046] bg-[#1e2024] p-6 md:p-8 backdrop-blur-xl mb-8 relative overflow-hidden shadow-xl shadow-black/40">
      {/* Decorative subtle MetaMask Fox Orange ambient glow */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-[#f6851b]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Network Pill & Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#2e3238] relative z-10">
        <div className="flex items-center gap-2.5">
          {/* MetaMask Fox Identicon Badge */}
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f6851b] to-[#cd6116] text-xl shadow-md shadow-[#f6851b]/20 border border-[#f6851b]/40">
            🦊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#f2f4f6] text-sm">
                MetaMask Portfolio Vault
              </span>
              <span className="rounded-full bg-[#f6851b]/15 border border-[#f6851b]/30 px-2 py-0.5 text-[9px] font-mono text-[#f6851b] font-semibold">
                ACTIVE
              </span>
            </div>
            {activeWalletAddress && (
              <div className="flex items-center gap-1.5 text-xs text-[#848c96] font-mono mt-0.5">
                <span>{formatAddress(activeWalletAddress, 6)}</span>
                <button
                  onClick={handleCopy}
                  type="button"
                  title="Copy wallet address"
                  className="hover:text-[#f2f4f6] transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Network & Verification Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#3b4046] bg-[#24272a] px-3 py-1 text-xs font-medium text-[#f2f4f6]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{chainName || "Ethereum / Sepolia"}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f6851b]/30 bg-[#f6851b]/10 px-3 py-1 text-xs font-mono text-[#f6851b]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>EIP-4361 SIWE</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        {/* Left: Vault Title & Quick Actions */}
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#848c96] font-semibold">
              MetaMask Sovereign Vault
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f2f4f6] mt-1">
              Zero-Knowledge Encrypted Storage
            </h1>
            <p className="text-sm text-[#848c96] max-w-xl mt-1.5 leading-relaxed">
              Files are encrypted locally in your browser using non-extractable AES-256 keys and pinned to decentralized IPFS. Plaintext never leaves your machine.
            </p>
          </div>

          {/* MetaMask Portfolio Signature Action Buttons */}
          <div className="pt-2 flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Action 1: Encrypt (Primary Fox Orange Button) */}
            <Link
              href="/dashboard/encrypt"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f6851b] hover:bg-[#e2761b] active:bg-[#cd6116] text-[#141618] px-4 py-2.5 font-bold text-xs shadow-md shadow-[#f6851b]/20 transition-all active:scale-[0.98]"
            >
              <Lock className="h-4 w-4" />
              <span>Encrypt File</span>
            </Link>

            {/* Action 2: Store on IPFS */}
            <Link
              href="/dashboard/vault"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3b4046] bg-[#24272a] hover:bg-[#2b2f34] text-[#f2f4f6] px-4 py-2.5 font-semibold text-xs transition-all active:scale-[0.98]"
            >
              <UploadCloud className="h-4 w-4 text-[#f6851b]" />
              <span>IPFS Vault</span>
            </Link>

            {/* Action 3: Key Wallet */}
            <button
              onClick={openVaultXModal}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3b4046] bg-[#24272a] hover:bg-[#2b2f34] text-[#f2f4f6] px-4 py-2.5 font-semibold text-xs transition-all active:scale-[0.98]"
            >
              <Key className="h-4 w-4 text-[#037dd6]" />
              <span>Manage Keys</span>
            </button>
          </div>
        </div>

        {/* Right: Sovereign Identity Card Panel */}
        <div className="identity-card flex flex-col gap-2.5 bg-[#141618] border border-[#2e3238] p-4 rounded-2xl font-mono text-xs w-full lg:w-auto min-w-[280px] shadow-lg">
          <div className="flex items-center justify-between gap-4 border-b border-[#2e3238] pb-2">
            <span className="text-[10px] uppercase text-[#848c96] font-semibold tracking-wider">
              Sovereign Identity
            </span>
            <span className="text-[10px] text-emerald-400 font-sans">Active Session</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* MetaMask / Web3 Identity */}
            {activeWalletAddress ? (
              <div className="flex items-center gap-2.5 bg-[#1e2024] p-2.5 rounded-xl border border-[#f6851b]/30">
                <span className="text-xl">🦊</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] text-[#848c96]">
                    <span>{isVaultXConnected ? "VaultX Key Vault" : "MetaMask Web3"}</span>
                    <span className="text-emerald-400 font-sans">● Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-[#f6851b] truncate font-mono text-[11px]">
                      {formatAddress(activeWalletAddress, 6)}
                    </span>
                    <button
                      onClick={handleCopy}
                      type="button"
                      title="Copy address"
                      className="p-0.5 rounded hover:bg-[#24272a] text-[#848c96] hover:text-[#f2f4f6]"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[#848c96] text-xs py-2">
                No active wallet session
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2e3238]">
            <span className="text-[10px] text-[#848c96]">Session Active</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                disabled={isLoggingOut}
                className="h-7 text-xs text-[#f6851b] border-[#f6851b]/30 hover:bg-[#f6851b]/15 px-2.5 rounded-lg"
              >
                <LogOut className="h-3 w-3 mr-1" />
                <span>{isLoggingOut ? "..." : "Log Out"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
