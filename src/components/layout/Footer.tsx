import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Terminal, Radio } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#3B4046] bg-[#141618] text-[#848C96] text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F6851B]/40 bg-[#1E2024] text-base">
                🦊
              </div>
              <span className="font-sans text-sm font-black tracking-wider text-white">
                Vault<span className="text-[#F6851B]">X</span>
              </span>
            </div>
            <p className="text-[#848C96] text-xs leading-relaxed">
              Decentralized, zero-knowledge file encryption and verifiable storage.
              Engineered with MetaMask portfolio design standards for sovereign privacy.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F6851B]/30 bg-[#F6851B]/10 px-2.5 py-1 text-[11px] font-mono text-[#F6851B]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F6851B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F6851B]"></span>
              </span>
              MetaMask Connected Standard
            </div>
          </div>

          {/* Protocol Architecture */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#F2F4F6] mb-3 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#F6851B]" />
              Security Architecture
            </h4>
            <ul className="space-y-2 text-[#848C96]">
              <li className="hover:text-[#F2F4F6] transition-colors">Client-Side AES-256-GCM</li>
              <li className="hover:text-[#F2F4F6] transition-colors">MetaMask SIWE Cryptographic Verification</li>
              <li className="hover:text-[#F2F4F6] transition-colors">IPFS Distributed Gateway Storage</li>
              <li className="hover:text-[#F2F4F6] transition-colors">Zero-Custody Local Key Wrapping</li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#F2F4F6] mb-3 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-[#037DD6]" />
              Application
            </h4>
            <ul className="space-y-2 text-[#848C96]">
              <li>
                <Link href="/" className="hover:text-[#F2F4F6] transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#F2F4F6] transition-colors">
                  Encrypted Vault Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/encrypt" className="hover:text-[#F2F4F6] transition-colors">
                  Local Encryption Engine
                </Link>
              </li>
              <li>
                <Link href="/dashboard/vault" className="hover:text-[#F2F4F6] transition-colors">
                  IPFS Decentralized Vault
                </Link>
              </li>
            </ul>
          </div>

          {/* Hackathon Specs */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#F2F4F6] mb-3 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-[#F6851B]" />
              Sovereign Blueprint
            </h4>
            <div className="rounded-xl border border-[#3B4046] bg-[#1E2024] p-3 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-[#848C96]">Primary Wallet:</span>
                <span className="text-[#F6851B] font-semibold">MetaMask</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-[#848C96]">Encryption:</span>
                <span className="text-white font-medium">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-[#848C96]">Storage Layer:</span>
                <span className="text-[#037DD6] font-medium">IPFS Decentralized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#2E3238] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#848C96] text-[11px]">
          <p>© 2026 VaultX. Sovereign Web3 Architecture styled with MetaMask Design System.</p>
          <p className="font-mono text-[#848C96]">
            SIWE Auth Active • Client-Side Zero Knowledge
          </p>
        </div>
      </div>
    </footer>
  );
}
