"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  KeyRound,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { formatAddress } from "@/lib/utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    isMounted,
    isConnected,
    isConnecting,
    address,
    chainName,
    isAuthenticated,
    isCheckingSession,
    authStage,
    authError,
    signInWithWallet,
    disconnect,
  } = useAuthStatus();

  const { identity: vaultXIdentity, isConnected: isVaultXConnected } = useVaultXWallet();
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedNonce, setCopiedNonce] = useState(false);

  const mockNonce = "8f2d" + (address ? address.slice(2, 6) : "6e4a") + "..." + "91bc";

  const handleCopyAddr = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleCopyNonce = () => {
    navigator.clipboard.writeText(mockNonce);
    setCopiedNonce(true);
    setTimeout(() => setCopiedNonce(false), 2000);
  };

  // 1. Initial Loading State
  if (!isMounted || isConnecting || isCheckingSession) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <div className="relative mb-4 h-16 w-16">
          <Image
            src="/images/owl-verify.png"
            alt="SecureVault Owl"
            fill
            className="object-contain animate-pulse rounded-2xl"
          />
        </div>
        <div className="font-semibold text-sm text-slate-800">
          Checking secure session...
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Verifying cryptographic authentication status
        </p>
      </div>
    );
  }

  // 2. Step: Connect Wallet
  const anyConnected = (isConnected && address) || (isVaultXConnected && vaultXIdentity);
  if (!anyConnected) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="relative mb-5 h-24 w-24">
          <Image
            src="/images/owl-verify.png"
            alt="SecureVault Owl"
            fill
            className="object-contain drop-shadow-md rounded-2xl"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Connect to SecureVault
        </h1>
        <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
          Your wallet is used as your Web3 identity. SecureVault never asks for your private key or seed phrase.
        </p>

        <div className="w-full flex justify-center mb-6">
          <WalletConnectButton size="lg" className="w-full" />
        </div>

        <Link href="/">
          <button className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>
        </Link>
      </div>
    );
  }

  // 3. Screen 3: Verify Your Identity (SIWE Challenge)
  if (!isAuthenticated && !isVaultXConnected) {
    const isWorking =
      authStage === "requesting_nonce" ||
      authStage === "awaiting_signature" ||
      authStage === "verifying";

    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in duration-300">
        {/* Owl Mascot looking down */}
        <div className="relative mb-4 h-24 w-24">
          <Image
            src="/images/owl-verify.png"
            alt="SecureVault Owl Guardian"
            fill
            className="object-contain drop-shadow-md rounded-2xl"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Verify your identity
        </h1>
        <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed mb-6">
          Sign a message to authenticate with SecureVault.
        </p>

        {/* Auth Details Card (Matching Screen 3) */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left text-xs mb-6 space-y-3.5">
          {/* Row 1: Wallet Address */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Wallet Address</span>
            <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
              <span>{formatAddress(address, 5)}</span>
              <button
                onClick={handleCopyAddr}
                type="button"
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy Address"
              >
                {copiedAddr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Row 2: Network */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Network</span>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>{chainName || "Sepolia"}</span>
            </div>
          </div>

          {/* Row 3: Nonce */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Nonce</span>
            <div className="flex items-center gap-1.5 font-mono text-slate-600">
              <span>{mockNonce}</span>
              <button
                onClick={handleCopyNonce}
                type="button"
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Copy Nonce"
              >
                {copiedNonce ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="w-full mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-left text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-relaxed">{authError}</p>
          </div>
        )}

        {/* Sign & Continue Button */}
        <div className="w-full space-y-3 mb-6">
          <button
            onClick={() => signInWithWallet()}
            disabled={isWorking}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {authStage === "requesting_nonce" && "Requesting Nonce..."}
                  {authStage === "awaiting_signature" && "Confirm in Wallet..."}
                  {authStage === "verifying" && "Verifying Signature..."}
                </span>
              </>
            ) : (
              <span>Sign & Continue</span>
            )}
          </button>

          <button
            onClick={() => disconnect()}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Disconnect & Switch Wallet
          </button>
        </div>

        {/* Info Callout Note (Screen 3) */}
        <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-left text-xs text-amber-800 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This is a signature request, not a blockchain transaction. It will not cost any gas fees.
          </p>
        </div>
      </div>
    );
  }

  // 4. Authenticated State: Allow Access
  return <>{children}</>;
}
