"use client";

import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, Wallet, Lock, Plus } from "lucide-react";
import { cn, formatAddress } from "@/lib/utils";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { ConnectWalletModal } from "./ConnectWalletModal";

interface WalletConnectButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  showNetworkBadge?: boolean;
}

/**
 * WalletConnectButton (Enhanced with VaultX Secure Wallet)
 * 
 * Preserves 100% of existing MetaMask functionality via RainbowKit,
 * and adds seamless dual-identity support for VaultX Secure Wallet.
 */
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
                "h-10 w-36 animate-pulse rounded-lg bg-zinc-800/60 border border-zinc-700/50",
                className
              )}
            />
          );
        }

        // Neither wallet is connected -> Show Main "Connect Wallet" button which opens choice modal
        if (!anyConnected) {
          return (
            <>
              <button
                onClick={() => setModalOpen(true)}
                type="button"
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
                  "bg-[#f6851b] hover:bg-[#e2761b] active:bg-[#cd6116] text-[#141618]",
                  "shadow-md shadow-[#f6851b]/20 border border-[#f6851b]/40",
                  size === "sm" && "h-8 px-3 text-xs",
                  size === "default" && "h-10 px-4 text-sm",
                  size === "lg" && "h-12 px-6 text-base tracking-wide",
                  className
                )}
              >
                <span className="text-base leading-none">🦊</span>
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

        // Handle wrong network for MetaMask
        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all",
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

        // Connected state: MetaMask takes priority when connected; VaultX displayed when active without MetaMask
        return (
          <>
            <div className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
              {metaMaskConnected && account ? (
                <>
                  {/* Chain Selector Pill (MetaMask) */}
                  {showNetworkBadge && chain && (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#3b4046] bg-[#1e2024] px-3 py-1.5 text-xs font-medium text-[#f2f4f6] hover:bg-[#2b2f34] hover:border-[#f6851b]/50 transition-colors"
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
                      <ChevronDown className="h-3 w-3 text-[#848c96]" />
                    </button>
                  )}

                  {/* 🦊 MetaMask Address Pill */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border border-[#3b4046] bg-[#1e2024] text-[#f2f4f6]",
                      "hover:border-[#f6851b]/60 hover:bg-[#2b2f34] transition-all active:scale-[0.98]",
                      size === "sm" && "h-8 px-2.5 text-xs",
                      size === "default" && "h-10 px-3.5 text-sm",
                      size === "lg" && "h-12 px-4 text-base"
                    )}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>

                    <span className="font-mono font-medium tracking-tight text-[#f6851b] flex items-center gap-1">
                      <span>🦊</span>
                      <span>{account.displayName || formatAddress(account.address)}</span>
                    </span>

                    {account.displayBalance && (
                      <span className="hidden md:inline text-xs text-[#848c96] border-l border-[#3b4046] pl-2 font-mono">
                        {account.displayBalance}
                      </span>
                    )}

                    <ChevronDown className="h-3.5 w-3.5 text-[#848c96]" />
                  </button>
                </>
              ) : isVaultXConnected && identity ? (
                /* 🔐 VaultX Secure Wallet Pill (Only when MetaMask is NOT connected) */
                <button
                  onClick={() => setModalOpen(true)}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-[#3b4046] bg-[#1e2024] text-[#f2f4f6]",
                    "hover:border-[#f6851b]/60 hover:bg-[#2b2f34] transition-all active:scale-[0.98]",
                    size === "sm" && "h-8 px-2.5 text-xs",
                    size === "default" && "h-10 px-3.5 text-sm",
                    size === "lg" && "h-12 px-4 text-base"
                  )}
                  title="VaultX Secure Wallet Identity (Protects File Encryption Keys)"
                >
                  <span className="text-[#f6851b]">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-mono font-medium tracking-tight text-[#f6851b]">
                    {identity.id}
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-[#f6851b]/15 border border-[#f6851b]/30 px-1.5 py-0.5 text-[9px] text-[#f6851b] font-semibold">
                    Protected
                  </span>
                </button>
              ) : (
                /* Neither connected */
                <button
                  onClick={() => setModalOpen(true)}
                  type="button"
                  className={cn(
                    "group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
                    "bg-[#f6851b] hover:bg-[#e2761b] active:bg-[#cd6116] text-[#141618]",
                    "shadow-md shadow-[#f6851b]/20 border border-[#f6851b]/40",
                    size === "sm" && "h-8 px-3 text-xs",
                    size === "default" && "h-10 px-4 text-sm",
                    size === "lg" && "h-12 px-6 text-base tracking-wide"
                  )}
                >
                  <span className="text-base leading-none">🦊</span>
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
