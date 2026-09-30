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
      {/* Subtle cybersecurity background grid and ambient lighting */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Cybersecurity pill tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-mono text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span>CYBER-10 Protocol • Phase 1 Foundation</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 font-sans leading-[1.15]">
              Your Files. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Encrypted.
              </span>{" "}
              Decentralized.{" "}
              <span className="text-zinc-100 underline decoration-cyan-500/40 decoration-wavy">
                Yours.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed mx-auto lg:mx-0">
              CYBER-10 is a decentralized secure file storage and sharing platform where users
              maintain complete, sovereign control of their data. Zero-knowledge local encryption ensures
              that no cloud provider, intermediary, or unauthorized actor can ever inspect your files.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Primary CTA */}
              {isConnected ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" variant="cyber" className="w-full sm:w-auto gap-2">
                    <span>Open Encrypted Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <div className="w-full sm:w-auto flex justify-center">
                  <WalletConnectButton size="lg" className="w-full sm:w-auto" />
                </div>
              )}

              {/* Secondary CTA */}
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                  <span>Explore Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </Button>
              </Link>
            </div>

            {/* Security Guarantee Micro-Bullets */}
            <div className="pt-6 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Zero Server Custody</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>AES-GCM-256 Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>EVM Wallet Identity</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Representation of Secure Decentralized Storage */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative Glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-purple-500/20 blur-xl opacity-60" />

              {/* Terminal / Secure Storage Vault Simulator Card */}
              <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl">
                {/* Window Bar */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-zinc-400">
                      CYBER10_VAULT_ENGINE v1.0
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-zinc-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    NODE READY
                  </div>
                </div>

                {/* Storage Pipeline Visualization */}
                <div className="space-y-3 font-mono text-xs">
                  {/* Step 1: Plaintext payload */}
                  <div className="rounded-lg border border-zinc-800/90 bg-zinc-900/60 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
                        <FileCode2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-zinc-200 font-semibold">confidential_audit.pdf</div>
                        <div className="text-[10px] text-zinc-500">2.4 MB • Local Buffer</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      Unencrypted
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex items-center justify-center gap-2 text-zinc-500 text-[10px]">
                    <div className="h-px bg-zinc-800 flex-1" />
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Lock className="h-3 w-3" /> Client-Side Encryption
                    </span>
                    <div className="h-px bg-zinc-800 flex-1" />
                  </div>

                  {/* Step 2: Encrypted Cipherblock */}
                  <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-cyan-300 font-semibold">9f8b4c7e...3a1d.enc</div>
                        <div className="text-[10px] text-zinc-400">Cipher: AES-GCM-256</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      Zero-Knowledge
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex items-center justify-center gap-2 text-zinc-500 text-[10px]">
                    <div className="h-px bg-zinc-800 flex-1" />
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Database className="h-3 w-3" /> Decentralized Pinning
                    </span>
                    <div className="h-px bg-zinc-800 flex-1" />
                  </div>

                  {/* Step 3: IPFS Decentralized Swarm */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                        <HardDriveDownload className="h-3.5 w-3.5 text-purple-400" />
                        Decentralized Swarm Allocation
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">100% Pinned</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full w-[85%] rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>CID: bafybeigdyrzt5...</span>
                      <span>3 Swarm Replicas</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Key Guarantee */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-cyan-400" />
                    Key derivation:
                  </span>
                  <span className="font-mono text-zinc-200">EVM Wallet Signed Secret</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
