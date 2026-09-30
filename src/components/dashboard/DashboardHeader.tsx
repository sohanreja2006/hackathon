"use client";

import React, { useState } from "react";
import { Copy, Check, LogOut, ShieldCheck } from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { formatAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { address, chainName, disconnect, logout } = useAuthStatus();
  const { identity, isConnected: isVaultXConnected, openModal: openVaultXModal } = useVaultXWallet();
  const { googleUser, isGoogleAuthenticated, googleSignOut } = useGoogleAuth();
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (isGoogleAuthenticated) {
        await googleSignOut("/");
      } else {
        await logout();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl mb-8 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Title and Verified Session Details */}
        <div className="space-y-3">
          <div className="security-pills flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                {isGoogleAuthenticated && !address
                  ? "Google OAuth 2.0 Verified"
                  : "Cryptographically Verified (SIWE / EIP-4361)"}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-xs font-mono text-cyan-300">
              <ShieldCheck className="h-3 w-3 text-cyan-400" />
              <span>HttpOnly Session Guard</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Welcome to CYBER-10
          </h1>

          <p className="text-sm text-zinc-400 max-w-xl">
            Decentralized sovereign vault for your confidential files.
            Authenticated via non-custodial cryptographic signature.
          </p>
        </div>

        {/* Right: Connected Identity */}
        <div className="identity-card flex flex-col gap-2.5 bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl font-mono text-xs w-full lg:w-auto">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-2">
            <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">
              Connected Identity
            </span>
            <span className="text-[10px] text-emerald-400 font-sans">Active Session</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Google User Identity */}
            {isGoogleAuthenticated && googleUser ? (
              <div className="flex items-center gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-violet-900/30 min-w-[240px]">
                {googleUser.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={googleUser.image}
                    alt={googleUser.name ?? "Google user"}
                    className="h-8 w-8 rounded-full border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {googleUser.name?.[0] ?? "G"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Google Account</span>
                    <span className="text-emerald-400">● Connected</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-zinc-200 truncate text-[11px]">
                      {googleUser.name ?? googleUser.email}
                    </span>
                  </div>
                  {googleUser.email && (
                    <p className="text-[10px] text-zinc-500 truncate">{googleUser.email}</p>
                  )}
                </div>
              </div>
            ) : address ? (
              /* MetaMask Identity */
              <div className="flex items-center gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800 min-w-[240px]">
                <span className="text-xl">🦊</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>MetaMask Web3 Wallet</span>
                    <span className="text-emerald-400">● Connected</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-zinc-200 truncate">
                      {formatAddress(address, 6)}
                    </span>
                    <button
                      onClick={handleCopy}
                      type="button"
                      title="Copy full address"
                      className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : isVaultXConnected && identity ? (
              /* 3. VaultX Secure Wallet Identity (Only when MetaMask is not connected) */
              <div className="flex items-center gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-violet-900/30 min-w-[240px]">
                <span className="text-xl">🔐</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>VaultX Secure Wallet</span>
                    <span className="text-violet-400">● Protected</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-violet-300 truncate">
                      {identity.id}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Row */}
          <div className="dashboard-header-actions flex items-center justify-between pt-1 text-[11px] font-sans">
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px]">
              <span>Network:</span>
              <span className="text-cyan-400 font-medium">{chainName || "EVM"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                disabled={isLoggingOut}
                className="h-7 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-950/30 px-2.5"
                title="Invalidate SIWE session"
              >
                <LogOut className="h-3 w-3 mr-1" />
                <span>{isLoggingOut ? "..." : "Log Out"}</span>
              </Button>
              <Button
                onClick={() => disconnect()}
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-500 hover:text-rose-400 px-2"
                title="Disconnect EVM wallet"
              >
                <span>Disconnect</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
