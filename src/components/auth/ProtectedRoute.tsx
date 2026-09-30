"use client";

import React from "react";
import { Shield, Lock, KeyRound, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Gate (Phase 2)
 * 
 * Strict two-tier cryptographic access gate:
 * Tier 1: EVM Wallet Connection (Wagmi)
 * Tier 2: Cryptographic Signature Verification (EIP-4361 / SIWE with HttpOnly session cookie)
 * 
 * Unauthenticated users are strictly barred from rendering dashboard contents.
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

  // 1. Initial SSR / Hydration / Session Handshake loading state
  if (!isMounted || isConnecting || isCheckingSession) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-zinc-900 shadow-lg shadow-cyan-500/10">
          <Shield className="h-7 w-7 text-cyan-400 animate-pulse" />
        </div>
        <div className="font-mono text-sm text-zinc-300">
          Checking EVM Wallet & Cryptographic Session...
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Validating sovereign credentials with zero-knowledge gateway
        </p>
      </div>
    );
  }

  // 2. Disconnected State: Prompt user to connect wallet first
  if (!isConnected || !address) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-cyan-500/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <Lock className="h-9 w-9 text-cyan-400" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] text-rose-300 font-mono">
              !
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-mono text-zinc-400">
            <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
            SECURE VAULT GATEWAY
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Connect Wallet to Access Workspace
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
            Connect your EVM wallet to access your encrypted files, view decentralized storage
            metrics, and manage sovereign access delegation.
          </p>
        </div>

        <div className="w-full flex justify-center mb-6">
          <WalletConnectButton size="lg" className="w-full sm:w-auto min-w-[220px]" />
        </div>

        <div className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-left text-xs font-mono space-y-2 mb-6">
          <div className="flex items-center gap-2 text-zinc-300">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Non-custodial: Private keys never requested or stored</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <Lock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Zero-Knowledge: Local browser-only decryption</span>
          </div>
        </div>

        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>
    );
  }

  // 3. Connected But NOT Authenticated State: Require SIWE Signature Verification
  if (!isAuthenticated) {
    const isWorking =
      authStage === "requesting_nonce" ||
      authStage === "awaiting_signature" ||
      authStage === "verifying";

    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-amber-500/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-zinc-900 shadow-2xl">
            <KeyRound className="h-9 w-9 text-amber-400" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] text-cyan-300 font-mono">
              EIP
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-mono text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            AUTHENTICATION REQUIRED
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Verify Wallet Ownership
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
            Your wallet is connected, but wallet connection is not authentication.
            Sign a cryptographic challenge (EIP-4361 / SIWE) to prove ownership of this address.
          </p>
        </div>

        {/* Connected Address Indicator */}
        <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 mb-6 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Connected Wallet:</span>
          </div>
          <span className="text-cyan-300 font-semibold">
            {formatAddress(address, 6)}
          </span>
        </div>

        {/* Error Banner if user rejected or verification failed */}
        {authError && (
          <div className="w-full mb-6 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-left text-xs font-mono text-rose-300 flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-200">Authentication Failed</div>
              <p className="text-rose-300/90 mt-0.5 leading-relaxed">{authError}</p>
            </div>
          </div>
        )}

        {/* Primary SIWE Sign-In Button */}
        <div className="w-full flex flex-col gap-3 mb-8">
          <Button
            size="lg"
            variant="cyber"
            onClick={() => signInWithWallet()}
            disabled={isWorking}
            className="w-full gap-2 text-base font-semibold py-6 shadow-lg shadow-cyan-950/50"
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
                <span>Sign Message in Your Wallet...</span>
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
                  <span>Sign In With Wallet</span>
                </>
              )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Disconnect & Switch Wallet
          </Button>
        </div>

        {/* Cryptographic Security Details */}
        <div className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-left text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-zinc-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Gas-free off-chain signature (EIP-4361 / SIWE)</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Anti-replay protection: Single-use server nonce</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>HttpOnly cookie session: Inaccessible to client JS / XSS</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated State: Render verified workspace
  return <>{children}</>;
}
