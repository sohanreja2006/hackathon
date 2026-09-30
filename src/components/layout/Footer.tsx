import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Terminal, Radio } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950/90 text-zinc-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/40 bg-zinc-900">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="font-mono text-sm font-bold tracking-wider text-zinc-100">
                CYBER<span className="text-cyan-400">-10</span>
              </span>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Decentralized, zero-knowledge file encryption and verifiable storage.
              Engineered for absolute data sovereignty.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-mono text-cyan-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              Phase 1 Active (Frontend & Wallet)
            </div>
          </div>

          {/* Protocol Architecture */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              Security Architecture
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li className="hover:text-zinc-300 transition-colors">Client-Side AES-GCM-256</li>
              <li className="hover:text-zinc-300 transition-colors">EIP-4361 SIWE Identity (Phase 2)</li>
              <li className="hover:text-zinc-300 transition-colors">IPFS Content Addressing (Phase 4)</li>
              <li className="hover:text-zinc-300 transition-colors">Zero-Knowledge Key Derivation</li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              Application
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/" className="hover:text-zinc-300 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
                  Encrypted Vault Dashboard
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-zinc-300 transition-colors">
                  Workflow Guide
                </Link>
              </li>
              <li>
                <Link href="/#security" className="hover:text-zinc-300 transition-colors">
                  Threat Model & Assurances
                </Link>
              </li>
            </ul>
          </div>

          {/* Hackathon Specs */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-purple-400" />
              Project Blueprint
            </h4>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">Target Track:</span>
                <span className="text-zinc-200">Web3 / Cybersecurity</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">Current Scope:</span>
                <span className="text-cyan-400">Phase 1 Foundation</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">Private Keys:</span>
                <span className="text-emerald-400">Non-Custodial</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© 2026 CYBER-10 Protocol. Non-custodial, client-encrypted architecture.</p>
          <p className="font-mono text-zinc-600">
            SHA256: 9b2d8f...4e10 • All telemetry encrypted
          </p>
        </div>
      </div>
    </footer>
  );
}
