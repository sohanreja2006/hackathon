"use client";

import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, Lock } from "lucide-react";
import { cn, formatAddress } from "@/lib/utils";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { ConnectWalletModal } from "./ConnectWalletModal";

interface WalletConnectButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  showNetworkBadge?: boolean;
}

export function WalletConnectButton({
  className,
  size = "default",
  showNetworkBadge = true,
}: WalletConnectButtonProps) {
  const { identity, isConnected: isVaultXConnected } = useVaultXWallet();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const metaMaskConnected = ready && account && chain;
        const anyConnected = metaMaskConnected || isVaultXConnected;

        if (!ready) {
          return (
            <div
              className={cn(
                "h-10 w-36 animate-pulse rounded-full bg-slate-100 border border-slate-200",
                className
              )}
            />
          );
        }

        // Neither wallet connected -> Show Main "Connect Wallet" button
        if (!anyConnected) {
          return (
            <>
              <button
                onClick={() => setModalOpen(true)}
                type="button"
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200",
                  "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white",
                  "shadow-sm shadow-blue-500/20",
                  size === "sm" && "h-8 px-4 text-xs",
                  size === "default" && "h-10 px-5 text-sm",
                  size === "lg" && "h-12 px-7 text-base tracking-wide",
                  className
                )}
              >
                <span>Connect Wallet</span>
              </button>

              <ConnectWalletModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onOpenMetaMask={openConnectModal}
              />
            </>
          );
        }

        // Handle wrong network
        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-all",
                className
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              Wrong Network
            </button>
          );
        }

        // Connected state
        return (
          <>
            <div className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
              {metaMaskConnected && account ? (
                <>
                  {/* Chain Selector Pill */}
                  {showNetworkBadge && chain && (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                      title={`Switch Network: Currently on ${chain.name}`}
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={chain.name ?? "Chain icon"}
                          src={chain.iconUrl}
                          className="h-3.5 w-3.5 rounded-full"
                        />
                      )}
                      <span className="max-w-[100px] truncate">{chain.name}</span>
                      <ChevronDown className="h-3 w-3 text-purple-500" />
                    </button>
                  )}

                  {/* Address Pill */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-800 shadow-2xs",
                      "hover:border-blue-300 hover:bg-slate-50 transition-all active:scale-[0.98]",
                      size === "sm" && "h-8 px-3 text-xs",
                      size === "default" && "h-10 px-4 text-sm",
                      size === "lg" && "h-12 px-5 text-base"
                    )}
                  >
                    <span className="text-base">🦊</span>
                    <span className="font-mono font-semibold tracking-tight text-slate-900">
                      {account.displayName || formatAddress(account.address)}
                    </span>

                    {account.displayBalance && (
                      <span className="hidden md:inline text-xs text-slate-500 border-l border-slate-200 pl-2 font-mono">
                        {account.displayBalance}
                      </span>
                    )}

                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </>
              ) : isVaultXConnected && identity ? (
                /* Secure Key Wallet Pill */
                <button
                  onClick={() => setModalOpen(true)}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 text-blue-800 shadow-2xs",
                    "hover:bg-blue-100 transition-all active:scale-[0.98]",
                    size === "sm" && "h-8 px-3 text-xs",
                    size === "default" && "h-10 px-4 text-sm",
                    size === "lg" && "h-12 px-5 text-base"
                  )}
                >
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-mono font-semibold tracking-tight text-blue-900">
                    {identity.id}
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                    Protected
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  type="button"
                  className={cn(
                    "group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200",
                    "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white shadow-sm",
                    size === "sm" && "h-8 px-4 text-xs",
                    size === "default" && "h-10 px-5 text-sm",
                    size === "lg" && "h-12 px-7 text-base"
                  )}
                >
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>

            <ConnectWalletModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              onOpenMetaMask={openConnectModal}
            />
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
