"use client";

import React from "react";
import { Shield, KeyRound, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Gate (MetaMask Sovereign Web3 Security)
 * 
 * Access to the decentralized workspace requires:
 * 1. Web3 Wallet Connection (MetaMask / VaultX Keys)
 * 2. Cryptographic EIP-4361 SIWE Signature Verification
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    isMounted,
    isConnected,
    isConnecting,
    address,
    isAuthenticated,
    isCheckingSession,
    authStage,
    authError,
    signInWithWallet,
    disconnect,
  } = useAuthStatus();

  const { identity: vaultXIdentity, isConnected: isVaultXConnected } = useVaultXWallet();

  // 1. Initial Loading State
  if (!isMounted || isConnecting || isCheckingSession) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center bg-[#141618]">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#1E2024] shadow-lg shadow-[#F6851B]/10 text-2xl">
          🦊
        </div>
        <div className="font-mono text-sm text-[#F2F4F6] font-semibold">
          Checking Sovereign Session...
        </div>
        <p className="mt-1 text-xs text-[#848C96]">
          Validating MetaMask credentials with zero-knowledge gateway
        </p>
      </div>
    );
  }

  // 2. Require MetaMask / Web3 Wallet connection
  const anyConnected = (isConnected && address) || (isVaultXConnected && vaultXIdentity);
  if (!anyConnected) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-[#F6851B]/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#1E2024] shadow-2xl text-4xl">
            🦊
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F6851B]/40 bg-[#F6851B]/15 px-3 py-1 text-xs font-mono text-[#F6851B] font-bold">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#F6851B] animate-ping" />
            <span>WALLET REQUIRED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Connect MetaMask Wallet
          </h1>
          <p className="text-xs text-[#848C96] leading-relaxed max-w-md">
            Connect your MetaMask EVM wallet to access your sovereign decentralized storage vault, decrypt local files, and manage encryption keys.
          </p>
        </div>

        <div className="w-full flex justify-center mb-6">
          <WalletConnectButton size="lg" className="w-full sm:w-auto min-w-[220px]" />
        </div>

        <div className="w-full rounded-2xl border border-[#3B4046] bg-[#1E2024] p-4 text-left text-xs font-mono space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Non-custodial: Private keys never leave your browser</span>
          </div>
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <KeyRound className="h-3.5 w-3.5 text-[#F6851B] shrink-0" />
            <span>EIP-4361 Sovereign Signatures for cryptographic access</span>
          </div>
        </div>

        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#848C96] hover:text-[#F2F4F6]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>
    );
  }

  // 3. Connected with MetaMask But NOT Authenticated: Require SIWE Signature Verification (if VaultX not connected)
  if (!isAuthenticated && !isVaultXConnected) {
    const isWorking =
      authStage === "requesting_nonce" ||
      authStage === "awaiting_signature" ||
      authStage === "verifying";

    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-[#F6851B]/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#1E2024] shadow-2xl">
            <KeyRound className="h-9 w-9 text-[#F6851B]" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F6851B]/20 border border-[#F6851B]/40 text-[10px] text-[#F6851B] font-mono font-bold">
              SIWE
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F6851B]/40 bg-[#F6851B]/15 px-3 py-1 text-xs font-mono text-[#F6851B] font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            VERIFY WALLET OWNERSHIP
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Verify MetaMask Signature
          </h1>
          <p className="text-xs text-[#848C96] leading-relaxed max-w-md">
            Sign a cryptographic challenge (EIP-4361 / SIWE) with your connected MetaMask wallet to prove ownership and unlock the vault.
          </p>
        </div>

        {/* Connected Address Indicator */}
        <div className="w-full rounded-2xl border border-[#3B4046] bg-[#1E2024] p-3.5 mb-6 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#848C96]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Connected Wallet:</span>
          </div>
          <span className="text-[#F6851B] font-semibold">
            {formatAddress(address, 6)}
          </span>
        </div>

        {/* Error Banner if user rejected or verification failed */}
        {authError && (
          <div className="w-full mb-6 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-left text-xs font-mono text-rose-300 flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-200">Authentication Failed</div>
              <p className="text-rose-300/90 mt-0.5 leading-relaxed">{authError}</p>
            </div>
          </div>
        )}

        {/* Primary SIWE Sign-In Button */}
        <div className="w-full flex flex-col gap-3 mb-8">
          <button
            onClick={() => signInWithWallet()}
            disabled={isWorking}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {authStage === "requesting_nonce" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating Single-Use Nonce...</span>
              </>
            )}
            {authStage === "awaiting_signature" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Sign Message in MetaMask...</span>
              </>
            )}
            {authStage === "verifying" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Verifying Cryptographic Signature...</span>
              </>
            )}
            {authStage !== "requesting_nonce" &&
              authStage !== "awaiting_signature" &&
              authStage !== "verifying" && (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span>Sign In With MetaMask</span>
                </>
              )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="text-xs text-[#848C96] hover:text-[#F2F4F6]"
          >
            Disconnect & Switch Wallet
          </Button>
        </div>

        {/* Cryptographic Security Details */}
        <div className="w-full rounded-2xl border border-[#3B4046] bg-[#1E2024] p-4 text-left text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#F6851B] shrink-0" />
            <span>Gas-free off-chain signature (EIP-4361 / SIWE)</span>
          </div>
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Anti-replay protection: Single-use server nonce</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated State: Wallet Verified!
  return <>{children}</>;
}
