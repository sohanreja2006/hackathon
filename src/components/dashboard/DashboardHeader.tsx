"use client";

import React, { useState } from "react";
import { Copy, Check, LogOut, Key, ShieldCheck, Lock } from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { formatAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { address, chainName, disconnect, logout } = useAuthStatus();
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
      await logout();
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cryptographically Verified (SIWE / EIP-4361)</span>
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

        {/* Right: Authenticated Identity & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-xl font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-cyan-500/30 bg-zinc-900 flex items-center justify-center text-cyan-400">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider flex items-center gap-1">
                <span>Authenticated Address</span>
                <Lock className="h-2.5 w-2.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200">
                  {formatAddress(address, 6)}
                </span>
                <button
                  onClick={handleCopy}
                  type="button"
                  title="Copy full address"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-zinc-800 mx-1" />

          {/* Network, Logout, and Disconnect actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-zinc-500">Network</span>
              <span className="text-xs text-cyan-400 font-medium truncate max-w-[100px]">
                {chainName || "EVM Network"}
              </span>
            </div>

            {/* Logout button (invalidates SIWE server session) */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              className="gap-1.5 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-950/30 hover:border-amber-500/60 ml-2"
              title="Invalidate SIWE session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
            </Button>

            {/* Full wallet disconnect */}
            <Button
              onClick={() => disconnect()}
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-500 hover:text-rose-400"
              title="Disconnect EVM wallet"
            >
              <span>Disconnect</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
