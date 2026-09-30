"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Lock, 
  Database, 
  Key, 
  CheckCircle2, 
  FileCode2,
  HardDriveDownload
} from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { isConnected } = useAuthStatus();

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Subtle MetaMask background ambient lighting */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#F6851B]/15 via-[#037DD6]/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#2E3238_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* MetaMask pill tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F6851B]/40 bg-[#F6851B]/15 px-3 py-1 text-xs font-mono text-[#F6851B]">
              <span className="text-sm">🦊</span>
              <span className="font-bold">METAMASK Sovereign Web3 Vault</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-sans leading-[1.15]">
              Your Files. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#F6851B] to-[#FFA857] bg-clip-text text-transparent">
                Encrypted.
              </span>{" "}
              Decentralized.{" "}
              <span className="text-white underline decoration-[#F6851B]/50 decoration-wavy">
                Yours.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="max-w-2xl text-base sm:text-lg text-[#848C96] leading-relaxed mx-auto lg:mx-0">
              VaultX is a decentralized sovereign file vault powered by MetaMask Web3 authentication.
              Client-side AES-256-GCM encryption guarantees zero server custody — your plaintext never leaves your device.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Primary CTA */}
              {isConnected ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]">
                    <span>Open Sovereign Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              ) : (
                <div className="w-full sm:w-auto flex justify-center">
                  <WalletConnectButton size="lg" className="w-full sm:w-auto" />
                </div>
              )}

              {/* Secondary CTA */}
              <Link href="/dashboard" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#3B4046] bg-[#24272A] hover:bg-[#2B2F34] text-white font-semibold text-sm transition-all">
                  <span>Explore Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-[#848C96]" />
                </button>
              </Link>
            </div>

            {/* Security Guarantee Micro-Bullets */}
            <div className="pt-6 border-t border-[#2E3238] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-[#848C96]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[#F2F4F6]">Zero Server Custody</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#F6851B] shrink-0" />
                <span className="text-[#F2F4F6]">AES-256-GCM Engine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#037DD6] shrink-0" />
                <span className="text-[#F2F4F6]">MetaMask SIWE Identity</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Representation of Secure Decentralized Storage */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative Glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#F6851B]/20 via-[#037DD6]/20 to-[#F6851B]/10 blur-xl opacity-60" />

              {/* Terminal / Secure Storage Vault Simulator Card */}
              <div className="relative rounded-2xl border border-[#3B4046] bg-[#1E2024] p-5 shadow-2xl backdrop-blur-xl">
                {/* Window Bar */}
                <div className="flex items-center justify-between border-b border-[#2E3238] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-[#848C96]">
                      METAMASK_VAULT_ENGINE v2.4
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#141618] px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-[#3B4046]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SOVEREIGN
                  </div>
                </div>

                {/* Storage Pipeline Visualization */}
                <div className="space-y-3 font-mono text-xs">
                  {/* Step 1: Plaintext payload */}
                  <div className="rounded-xl border border-[#3B4046] bg-[#141618] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#24272A] border border-[#3B4046] flex items-center justify-center text-[#F2F4F6]">
                        <FileCode2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[#F2F4F6] font-semibold">confidential_audit.pdf</div>
                        <div className="text-[10px] text-[#848C96]">2.4 MB • Local Memory</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#848C96] bg-[#24272A] px-2 py-0.5 rounded border border-[#3B4046]">
                      Plaintext
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex items-center justify-center gap-2 text-[#848C96] text-[10px]">
                    <div className="h-px bg-[#2E3238] flex-1" />
                    <span className="flex items-center gap-1 text-[#F6851B] font-semibold">
                      <Lock className="h-3 w-3" /> Client-Side AES-256
                    </span>
                    <div className="h-px bg-[#2E3238] flex-1" />
                  </div>

                  {/* Step 2: Encrypted Cipherblock */}
                  <div className="rounded-xl border border-[#F6851B]/40 bg-[#F6851B]/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#F6851B]/20 border border-[#F6851B]/40 flex items-center justify-center text-[#F6851B]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[#F6851B] font-semibold">9f8b4c7e...3a1d.enc</div>
                        <div className="text-[10px] text-[#848C96]">Authenticated: AES-GCM</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#F6851B] bg-[#F6851B]/20 px-2 py-0.5 rounded-full border border-[#F6851B]/40 font-bold">
                      Zero-Knowledge
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex items-center justify-center gap-2 text-[#848C96] text-[10px]">
                    <div className="h-px bg-[#2E3238] flex-1" />
                    <span className="flex items-center gap-1 text-[#037DD6] font-semibold">
                      <Database className="h-3 w-3" /> IPFS Decentralized Swarm
                    </span>
                    <div className="h-px bg-[#2E3238] flex-1" />
                  </div>

                  {/* Step 3: IPFS Decentralized Swarm */}
                  <div className="rounded-xl border border-[#3B4046] bg-[#141618] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#848C96] text-[11px] flex items-center gap-1.5">
                        <HardDriveDownload className="h-3.5 w-3.5 text-[#037DD6]" />
                        Pinata Distributed Gateway
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">100% Pinned</span>
                    </div>
                    <div className="w-full bg-[#24272A] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#F6851B] h-full w-[85%] rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#848C96]">
                      <span>CID: bafybeigdyrzt5...</span>
                      <span>Encrypted Ciphertext</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Key Guarantee */}
                <div className="mt-4 pt-3 border-t border-[#2E3238] flex items-center justify-between text-[11px] text-[#848C96]">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-[#F6851B]" />
                    Sovereign Derivation:
                  </span>
                  <span className="font-mono text-white font-semibold">MetaMask Wallet Signed SIWE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
