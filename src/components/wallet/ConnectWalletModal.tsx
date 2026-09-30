"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { formatAddress, cn } from "@/lib/utils";
import { OwlCompanion } from "@/components/ui/OwlCompanion";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMetaMask: () => void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  onOpenMetaMask,
}: ConnectWalletModalProps) {
  const { address, isConnected: isMetaMaskConnected, disconnect: disconnectMetaMask } = useAuthStatus();
  const {
    identity,
    hasExistingWallet,
    isConnected: isVaultXConnected,
    isCreating,
    createWallet,
    unlockWallet,
    disconnectWallet,
  } = useVaultXWallet();

  const [activeView, setActiveView] = useState<"choose" | "create" | "created_success">("choose");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyMetaMask = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCreateVaultX = async () => {
    setErrorMsg(null);
    try {
      if (hasExistingWallet) {
        await unlockWallet();
      } else {
        await createWallet();
      }
      setActiveView("created_success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize Secure Key Wallet.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Screen 2: Connect to SecureVault ── */}
        {activeView === "choose" && (
          <div className="p-8 text-center">
            {/* Friendly Living Owl Mascot Header */}
            <div className="relative mx-auto mb-3 flex items-center justify-center">
              <OwlCompanion state="connecting" size="md" trackMouse />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Connect to SecureVault
            </h2>
            <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Your wallet is used as your Web3 identity. SecureVault never asks for your private key or seed phrase.
            </p>

            {/* Wallet Selection Cards */}
            <div className="mt-6 space-y-3 text-left">
              {/* MetaMask Option */}
              <button
                type="button"
                onClick={() => {
                  if (isMetaMaskConnected) {
                    onClose();
                  } else {
                    onClose();
                    onOpenMetaMask();
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                  isMetaMaskConnected
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-2xl shrink-0">
                    🦊
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">MetaMask</span>
                      {isMetaMaskConnected && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isMetaMaskConnected && address
                        ? formatAddress(address, 6)
                        : "Connect using your MetaMask wallet"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Local Secure Key Wallet Option */}
              <button
                type="button"
                onClick={() => {
                  if (isVaultXConnected) {
                    onClose();
                  } else {
                    handleCreateVaultX();
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                  isVaultXConnected
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Secure Key Wallet</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isVaultXConnected
                        ? "Unlocked in active tab session"
                        : hasExistingWallet
                        ? "Saved key vault · Click to connect"
                        : "In-browser AES-256 local key engine"}
                    </p>
                  </div>
                </div>
                {isVaultXConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-semibold">
                      Connected
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        disconnectWallet();
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB]">
                    <span>{hasExistingWallet ? "Unlock" : "Create"}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                  </div>
                )}
              </button>
            </div>

            {/* Primary Action Button */}
            <div className="mt-6">
              <button
                onClick={() => {
                  onClose();
                  onOpenMetaMask();
                }}
                className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                Connect Wallet
              </button>
            </div>

            {/* Footer Note */}
            <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
              By connecting, you agree to our{" "}
              <span className="text-[#2563EB] hover:underline cursor-pointer">Terms of Service</span>{" "}
              and{" "}
              <span className="text-[#2563EB] hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        )}

        {/* Success View */}
        {activeView === "created_success" && (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Wallet Initialized</h3>
            <p className="text-xs text-slate-500">
              Your browser-encrypted key vault is unlocked and ready for zero-knowledge file operations.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-full bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
