"use client";

import React from "react";
import { Shield, Lock, KeyRound, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Gate (Enhanced with VaultX Secure Wallet)
 * 
 * Supports dual-tier cryptographic access:
 * Option 1: EVM Wallet Connection + SIWE Signature (MetaMask)
 * Option 2: VaultX Secure Wallet Identity (Client-Side Key Manager)
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
  const { isGoogleAuthenticated, isGoogleLoading, googleUser } = useGoogleAuth();

  // 1. Initial SSR / Hydration / Session Handshake loading state
  // Google-authenticated users skip all wallet checks — they have their own session
  if (isGoogleAuthenticated && googleUser) {
    return <>{children}</>;
  }

  if (!isMounted || isConnecting || isCheckingSession || isGoogleLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-zinc-900 shadow-lg shadow-cyan-500/10">
          <Shield className="h-7 w-7 text-cyan-400 animate-pulse" />
        </div>
        <div className="font-mono text-sm text-zinc-300">
          Checking Authentication Session...
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Validating sovereign credentials with zero-knowledge gateway
        </p>
      </div>
    );
  }

  // 2. Disconnected State: Prompt user to connect either MetaMask or VaultX Secure Wallet
  const anyConnected = (isConnected && address) || (isVaultXConnected && vaultXIdentity);
  if (!anyConnected) {
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

        <div className="w-full flex flex-col sm:flex-row items-center gap-3 mb-6">
          {/* Google Sign-In Option */}
          <Link
            href="/auth/signin"
            className="flex-1 flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-200 transition-all hover:bg-zinc-800 hover:border-zinc-600"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </Link>
          {/* MetaMask Option */}
          <WalletConnectButton size="lg" className="flex-1 w-full sm:w-auto min-w-[180px]" />
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

  // 3. Connected with MetaMask But NOT Authenticated: Require SIWE Signature Verification (if VaultX not connected)
  if (!isAuthenticated && !isVaultXConnected) {
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
