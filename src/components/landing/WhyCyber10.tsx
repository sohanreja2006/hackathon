import React from "react";
import { ShieldCheck, Unlock, Shield } from "lucide-react";

export function WhyCyber10() {
  const comparison = [
    {
      aspect: "Encryption Keys",
      traditional: "Server-side keys stored and managed by cloud vendors.",
      vaultx: "Client-side AES-256-GCM. Keys never leave your local browser.",
    },
    {
      aspect: "Data Custody",
      traditional: "Centralized server silos vulnerable to leaks and subpoenas.",
      vaultx: "Content-addressed IPFS chunks. Zero central server repository.",
    },
    {
      aspect: "Identity & Access",
      traditional: "Passwords and SMS 2FA subject to phishing and SIM swaps.",
      vaultx: "EIP-4361 Web3 wallet signatures and address identity.",
    },
    {
      aspect: "Availability",
      traditional: "Single point of failure. Cloud outages lock your files.",
      vaultx: "Decentralized peer-to-peer storage swarm with resilient availability.",
    },
  ];

  return (
    <section id="why-cyber10" className="py-20 md:py-24 border-t border-slate-200/80 bg-slate-50/50 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-[#2563EB]">
            <Shield className="h-3.5 w-3.5" />
            <span>ARCHITECTURAL COMPARISON</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Why SecureVault Matters
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Centralized cloud providers manage your private keys. SecureVault replaces vendor trust with local cryptographic certainty.
          </p>
        </div>

        {/* Comparison Matrix */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 bg-slate-50/80 p-4.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="md:col-span-3 text-slate-900">Architecture Vector</div>
            <div className="md:col-span-4 text-slate-500 flex items-center gap-1.5 mt-2 md:mt-0">
              <Unlock className="h-3.5 w-3.5 text-slate-400" />
              <span>Traditional Cloud Storage</span>
            </div>
            <div className="md:col-span-5 text-[#2563EB] flex items-center gap-1.5 mt-2 md:mt-0 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>SecureVault Protocol</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {comparison.map((item) => (
              <div
                key={item.aspect}
                className="grid grid-cols-1 md:grid-cols-12 p-5 gap-4 items-center hover:bg-slate-50/50 transition-colors"
              >
                {/* Vector Name */}
                <div className="md:col-span-3 text-sm font-bold text-slate-900">
                  {item.aspect}
                </div>

                {/* Traditional */}
                <div className="md:col-span-4 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{item.traditional}</span>
                </div>

                {/* SecureVault */}
                <div className="md:col-span-5 flex items-start gap-2 text-xs text-slate-800 leading-relaxed bg-blue-50/40 md:bg-transparent p-3 md:p-0 rounded-xl border border-blue-100 md:border-0 font-medium">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{item.vaultx}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
