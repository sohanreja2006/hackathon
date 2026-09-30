"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Lock,
  Zap,
  Globe,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { formatAddress } from "@/lib/utils";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

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
  } = useAuthStatus();

  // If already authenticated via SIWE, redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [isAuthenticated, callbackUrl, router]);

  if (!isMounted || isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141618]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#1E2024] text-2xl">
            🦊
          </div>
          <p className="text-sm font-mono text-[#848C96]">Checking sovereign session…</p>
        </div>
      </div>
    );
  }

  const isWorking =
    authStage === "requesting_nonce" ||
    authStage === "awaiting_signature" ||
    authStage === "verifying";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 bg-[#141618]">
      {/* Background ambient Fox glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-[#F6851B]/10 via-[#037DD6]/5 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#2E3238_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-mono text-[#848C96] hover:text-[#F2F4F6] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vault
        </Link>

        {/* Card */}
        <div className="relative rounded-2xl border border-[#3B4046] bg-[#1E2024] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F6851B]/40 bg-[#24272A] shadow-lg shadow-[#F6851B]/10 text-3xl">
              🦊
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F6851B]/15 border border-[#F6851B]/30 text-[#F6851B] text-[10px] font-bold uppercase tracking-wider mb-2">
              MetaMask Sovereign Security
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              VaultX Sovereign Sign In
            </h1>
            <p className="mt-1.5 text-xs text-[#848C96]">
              Non-custodial EIP-4361 cryptographic identity verification
            </p>
          </div>

          {/* Error banner */}
          {authError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p>{authError}</p>
            </div>
          )}

          {/* Action: Connect or Sign with MetaMask */}
          <div className="space-y-4">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-[#848C96] text-center mb-1">
                  Connect your MetaMask wallet to begin verification:
                </p>
                <WalletConnectButton size="lg" className="w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#3B4046] bg-[#24272A] p-3 text-xs font-mono flex items-center justify-between">
                  <span className="text-[#848C96]">Connected:</span>
                  <span className="text-[#F6851B] font-semibold">{formatAddress(address, 6)}</span>
                </div>

                <button
                  onClick={() => signInWithWallet()}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isWorking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying Signature...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Sign In With MetaMask</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Security features */}
          <div className="mt-8 space-y-2.5 rounded-xl border border-[#2E3238] bg-[#141618] p-4">
            <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-[#848C96]">
              Sovereign Security Guarantees
            </p>
            {[
              { icon: Lock, color: "text-[#F6851B]", text: "Zero-knowledge client-side AES-256-GCM encryption" },
              { icon: ShieldCheck, color: "text-emerald-400", text: "Non-custodial: Private keys never leave your browser" },
              { icon: Zap, color: "text-[#F6851B]", text: "SIWE challenge ensures cryptographically verified identity" },
              { icon: Globe, color: "text-[#037DD6]", text: "IPFS decentralized pinning — censorship-resistant storage" },
            ].map(({ icon: Icon, color, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-[#848C96]">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[11px] font-mono text-[#848C96]">
          VaultX Sovereign Vault · MetaMask Portfolio Design Standard
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#141618]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F6851B]" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
