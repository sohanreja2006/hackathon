"use client";

/**
 * Google Sign-In Page — /auth/signin
 * 
 * Beautiful, premium auth page that:
 * - Shows Google sign-in option
 * - Links back to MetaMask/VaultX wallet auth
 * - Consistent with CYBER-10 dark design system
 */

import React, { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Zap,
  Globe,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Failed to start Google sign-in. Please try again.",
  OAuthCallback: "Google authentication callback failed. Please try again.",
  OAuthCreateAccount: "Could not create account with Google credentials.",
  Callback: "Authentication callback error. Please try again.",
  OAuthAccountNotLinked:
    "This Google account is linked to another sign-in method.",
  AccessDenied: "Access was denied. Please grant the required permissions.",
  default: "An authentication error occurred. Please try again.",
};

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default) : null
  );

  // If already signed in, redirect immediately
  useEffect(() => {
    let mounted = true;
    getSession().then((session) => {
      if (!mounted) return;
      if (session?.user) {
        router.replace(callbackUrl);
      } else {
        setIsCheckingSession(false);
      }
    });
    return () => { mounted = false; };
  }, [callbackUrl, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google", {
        callbackUrl,
        redirect: true,
      });
    } catch {
      setError(ERROR_MESSAGES.default);
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
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
          {/* Decorative corner glow */}
          <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-[#F6851B]/10 blur-2xl" />

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
              Dual-layer decentralized sovereign encryption vault
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            id="google-signin-btn"
            className="group relative w-full flex items-center justify-center gap-3 rounded-xl border border-[#3B4046] bg-[#24272A] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:border-[#848C96] hover:bg-[#2B2F34] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-[#848C96]" />
                <span>Connecting to Google…</span>
              </>
            ) : (
              <>
                {/* Google "G" SVG */}
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2E3238]" />
            <span className="text-[11px] font-mono text-[#848C96]">or sovereign Web3</span>
            <div className="h-px flex-1 bg-[#2E3238]" />
          </div>

          {/* MetaMask / VaultX Wallet option */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98]"
          >
            <span className="text-lg">🦊</span>
            <span>Connect with MetaMask</span>
          </Link>

          {/* Security features */}
          <div className="mt-8 space-y-2.5 rounded-xl border border-[#2E3238] bg-[#141618] p-4">
            <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-[#848C96]">
              MetaMask Sovereign Security Guarantees
            </p>
            {[
              { icon: Lock, color: "text-[#F6851B]", text: "Zero-knowledge client-side AES-256-GCM encryption" },
              { icon: ShieldCheck, color: "text-emerald-400", text: "Files encrypted before upload — Google cannot access contents" },
              { icon: Zap, color: "text-[#F6851B]", text: "SIWE challenge ensures cryptographically verified identity" },
              { icon: Globe, color: "text-[#037DD6]", text: "IPFS decentralized pinning — resilient censorship-resistant storage" },
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
