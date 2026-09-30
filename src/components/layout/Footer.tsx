import React from "react";
import Link from "next/link";
import { Shield, Lock, Terminal, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-500 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-sans text-sm font-bold tracking-tight text-slate-900">
                Secure<span className="text-[#2563EB]">Vault</span>
              </span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Private files. Encrypted before they leave your device. Decentralized IPFS storage with end-to-end cryptographic integrity.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Zero-knowledge client-side encryption</span>
            </div>
          </div>

          {/* Security Architecture */}
          <div>
            <h4 className="font-semibold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#2563EB]" />
              Security Architecture
            </h4>
            <ul className="space-y-2 text-slate-500">
              <li>Client-Side AES-256-GCM</li>
              <li>EIP-4361 SIWE Verification</li>
              <li>Decentralized IPFS Storage</li>
              <li>SHA-256 Integrity Verification</li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-[#2563EB]" />
              Navigation
            </h4>
            <ul className="space-y-2 text-slate-500">
              <li>
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
                  Vault Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/encrypt" className="hover:text-slate-900 transition-colors">
                  Secure File
                </Link>
              </li>
              <li>
                <Link href="/dashboard/vault" className="hover:text-slate-900 transition-colors">
                  File Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Specs */}
          <div>
            <h4 className="font-semibold text-xs text-slate-900 mb-3">
              Guarantees
            </h4>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Encryption:</span>
                <span className="text-slate-800 font-medium">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Plaintext Transit:</span>
                <span className="text-emerald-600 font-semibold">0 bytes</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Storage Layer:</span>
                <span className="text-[#2563EB] font-medium">IPFS Network</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <p>© 2026 SecureVault. Encrypted on your device before storing on IPFS.</p>
          <p className="text-slate-500 font-medium">
            Plaintext never leaves your device.
          </p>
        </div>
      </div>
    </footer>
  );
}
