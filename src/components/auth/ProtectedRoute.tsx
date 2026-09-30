"use client";

import React from "react";
import { Shield, Lock, KeyRound, AlertTriangle, ArrowLeft, Loader2, CheckCircle2, Check, LogOut, User } from "lucide-react";
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
 * ProtectedRoute Gate (Dual-Layer Sovereign Security)
 * 
 * Layer 1: Google User Authentication (Identity & Account)
 * Layer 2: Web3 Wallet Connection & SIWE Signature (MetaMask / VaultX Keys)
 * 
 * Both layers must be satisfied before access to the decentralized workspace is granted.
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
  const { isGoogleAuthenticated, isGoogleLoading, googleUser, googleSignIn, googleSignOut } = useGoogleAuth();

  // 1. Initial Loading State
  if (!isMounted || isConnecting || isCheckingSession || isGoogleLoading) {
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

  // 2. LAYER 1: Require Google Authentication First
  if (!isGoogleAuthenticated || !googleUser) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#037DD6]/40 bg-[#037DD6]/10 px-3 py-1 text-xs font-mono text-[#037DD6] font-semibold">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#037DD6] animate-ping" />
            <span>STEP 1 OF 2 · USER AUTHENTICATION</span>
          </div>
          <div className="text-[#848C96] text-xs">→</div>
          <div className="rounded-full border border-[#3B4046] bg-[#1E2024] px-2.5 py-1 text-xs font-mono text-[#848C96]">
            STEP 2: METAMASK
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-[#037DD6]/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#3B4046] bg-[#1E2024] shadow-2xl">
            <User className="h-9 w-9 text-[#037DD6]" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#037DD6]/20 border border-[#037DD6]/40 text-[10px] text-[#037DD6] font-mono font-bold">
              1
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Sign In with Google
          </h1>
          <p className="text-xs text-[#848C96] leading-relaxed max-w-md">
            Sign in with your Google account to establish your workspace identity. Once verified, you will be prompted to connect your MetaMask wallet for decentralized cryptographic key management.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3 mb-6">
          <button
            onClick={() => googleSignIn("/dashboard")}
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#3B4046] bg-[#24272A] hover:bg-[#2B2F34] hover:border-[#848C96] px-5 py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.99] transition-all"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="w-full rounded-2xl border border-[#3B4046] bg-[#1E2024] p-4 text-left text-xs font-mono space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <Shield className="h-3.5 w-3.5 text-[#037DD6] shrink-0" />
            <span>Dual-Layer Security: Google OAuth + MetaMask Sovereign Signature</span>
          </div>
          <div className="flex items-center gap-2 text-[#F2F4F6]">
            <Lock className="h-3.5 w-3.5 text-[#F6851B] shrink-0" />
            <span>Zero-Knowledge: Local browser AES-256 decryption only</span>
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

  // 3. LAYER 2: Google is authenticated, now require MetaMask / Web3 Wallet connection
  const anyConnected = (isConnected && address) || (isVaultXConnected && vaultXIdentity);
  if (!anyConnected) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-mono text-emerald-300">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>STEP 1: GOOGLE VERIFIED</span>
          </div>
          <div className="text-[#848C96] text-xs">→</div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#F6851B]/40 bg-[#F6851B]/15 px-3 py-1 text-xs font-mono text-[#F6851B] font-bold">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#F6851B] animate-ping" />
            <span>STEP 2 OF 2 · CONNECT METAMASK</span>
          </div>
        </div>

        {/* User Identity Pill */}
        <div className="w-full rounded-2xl border border-[#3B4046] bg-[#1E2024] p-3 mb-6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {googleUser.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={googleUser.image}
                alt={googleUser.name ?? "Google"}
                className="h-7 w-7 rounded-full border border-[#3B4046] shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-[#037DD6] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {googleUser.name?.[0] ?? "G"}
              </div>
            )}
            <div className="flex flex-col text-left min-w-0">
              <span className="font-semibold text-white truncate">{googleUser.name}</span>
              <span className="text-[10px] text-[#848C96] font-mono truncate">{googleUser.email}</span>
            </div>
          </div>
          <button
            onClick={() => googleSignOut("/dashboard")}
            type="button"
            className="flex items-center gap-1 text-[11px] text-[#848C96] hover:text-rose-400 transition-colors ml-2 shrink-0"
            title="Switch account"
          >
            <LogOut className="h-3 w-3" />
            <span>Switch</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-[#F6851B]/10 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#1E2024] shadow-2xl text-4xl">
            🦊
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Connect MetaMask Wallet
          </h1>
          <p className="text-xs text-[#848C96] leading-relaxed max-w-md">
            Google authentication verified. Now connect your MetaMask wallet to unlock your decentralized storage vault, access your client-encrypted files, and sign cryptographic operations.
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

  // 4. Connected with MetaMask But NOT Authenticated: Require SIWE Signature Verification (if VaultX not connected)
  if (!isAuthenticated && !isVaultXConnected) {
    const isWorking =
      authStage === "requesting_nonce" ||
      authStage === "awaiting_signature" ||
      authStage === "verifying";

    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-mono text-emerald-300">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>GOOGLE VERIFIED</span>
          </div>
          <div className="text-[#848C96] text-xs">→</div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#F6851B]/40 bg-[#F6851B]/15 px-3 py-1 text-xs font-mono text-[#F6851B] font-bold">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#F6851B] animate-ping" />
            <span>SIGNATURE REQUIRED</span>
          </div>
        </div>

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

  // 5. Authenticated State: Both Google and Wallet Verified!
  return <>{children}</>;
}
