"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Database,
  RefreshCw,
  ArrowRight,
  Laptop,
  Layers,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { useAccount } from "wagmi";
import { SecureVaultOwl } from "@/components/ui/OwlCompanion";

export function Hero() {
  const { isConnected } = useAccount();

  const featureCards = [
    {
      title: "Client-side encryption",
      description: "Files encrypted on your device.",
      icon: Lock,
    },
    {
      title: "IPFS storage",
      description: "Encrypted chunks stored on decentralized IPFS.",
      icon: Database,
    },
    {
      title: "Integrity verification",
      description: "SHA-256 ensures your data is intact.",
      icon: ShieldCheck,
    },
    {
      title: "Resumable uploads",
      description: "Continue uploads even after interruption.",
      icon: RefreshCw,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9]/50 to-[#FFFFFF] pt-12 pb-20 md:pt-16 md:pb-28">
      {/* Background soft ambient radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/3 -translate-x-1/2 w-[600px] h-[500px] bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-cyan-100/30 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-16">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Private files. <br />
              <span className="text-[#2563EB]">Encrypted before</span> <br />
              they leave your device.
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              SecureVault encrypts your files on your device before storing encrypted data through decentralized IPFS infrastructure.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href={isConnected ? "/dashboard/encrypt" : "/dashboard"}>
                <button className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all active:scale-[0.98]">
                  <span>Secure a File</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>

              <a href="#how-it-works">
                <button className="flex items-center gap-2 px-6 py-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-all active:scale-[0.98]">
                  <span>See How It Works</span>
                </button>
              </a>
            </div>
          </div>

          {/* Right Column: Animated SVG Owl Guardian */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <div className="relative flex items-center justify-center">
              {/* Soft decorative glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-200/50 via-cyan-100/40 to-transparent blur-3xl transform scale-110" />
              <SecureVaultOwl
                state="idle"
                size="hero"
                trackMouse
                showSpeechBubble
                speechText="Your files stay encrypted on your device."
              />
            </div>
          </div>
        </div>

        {/* 4 Feature Cards Row (Screen 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Horizontal Pipeline Workflow Banner (Screen 1 Bottom) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="shrink-0 font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              <span>How it works</span>
            </div>

            <div className="flex-1 w-full flex flex-wrap md:flex-nowrap items-center justify-between gap-2 max-w-3xl">
              {/* Step 1 */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <Laptop className="h-4 w-4" />
                </div>
                <span>Your Device</span>
              </div>

              <div className="hidden sm:block h-px flex-1 bg-slate-200 mx-2" />

              {/* Step 2 */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <Lock className="h-4 w-4" />
                </div>
                <span>Encrypt</span>
              </div>

              <div className="hidden sm:block h-px flex-1 bg-slate-200 mx-2" />

              {/* Step 3 */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <Layers className="h-4 w-4" />
                </div>
                <span>Encrypted Chunks</span>
              </div>

              <div className="hidden sm:block h-px flex-1 bg-slate-200 mx-2" />

              {/* Step 4 */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <Globe className="h-4 w-4" />
                </div>
                <span>IPFS</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center text-xs text-emerald-700 font-medium gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Plaintext never leaves your device.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
