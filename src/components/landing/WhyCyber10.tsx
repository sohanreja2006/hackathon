import React from "react";
import { ShieldAlert, Unlock, ShieldCheck } from "lucide-react";

export function WhyCyber10() {
  const comparison = [
    {
      aspect: "Encryption Ownership",
      traditional: "Server-side encryption keys managed by the cloud vendor.",
      traditionalVulnerable: true,
      vaultx: "Client-side AES-GCM-256 with keys derived exclusively in your browser.",
      vaultxSafe: true,
    },
    {
      aspect: "Data Custody",
      traditional: "Centralized database servers subject to subpoena, rogue employees, and leaks.",
      traditionalVulnerable: true,
      vaultx: "Immutable peer-to-peer storage (IPFS). Zero central server repository.",
      vaultxSafe: true,
    },
    {
      aspect: "Identity & Access",
      traditional: "Vulnerable passwords, SMS 2FA sim-swaps, and corporate email tracking.",
      traditionalVulnerable: true,
      vaultx: "Cryptographic MetaMask wallet signatures and non-custodial address identity.",
      vaultxSafe: true,
    },
    {
      aspect: "Downtime & Censorship",
      traditional: "Single point of failure. Cloud outages or account de-platforming lock your data.",
      traditionalVulnerable: true,
      vaultx: "Content-addressed distributed swarm replication with high availability.",
      vaultxSafe: true,
    },
  ];

  return (
    <section id="why-cyber10" className="py-20 md:py-28 border-t border-[#2E3238] bg-[#141618] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/20 px-3.5 py-1 text-xs font-mono text-rose-300 shadow-sm">
            <ShieldAlert className="h-3.5 w-3.5" />
            PARADIGM SHIFT
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F2F4F6]">
            Why VaultX Matters
          </h2>
          <p className="text-[#848C96] text-sm sm:text-base leading-relaxed">
            Centralized cloud providers claim your data is safe, yet billions of records leak annually.
            VaultX replaces vendor trust with mathematical cryptographic certainty.
          </p>
        </div>

        {/* Comparison Table / Card Matrix */}
        <div className="rounded-2xl border border-[#3B4046] bg-[#1E2024] backdrop-blur-md overflow-hidden shadow-xl shadow-black/30">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-[#3B4046] bg-[#24272A] p-4.5 text-xs font-mono uppercase tracking-wider text-[#848C96]">
            <div className="md:col-span-3 font-semibold text-[#F2F4F6]">Architecture Vector</div>
            <div className="md:col-span-4 text-rose-400 flex items-center gap-1.5 mt-2 md:mt-0">
              <Unlock className="h-3.5 w-3.5" />
              Traditional Cloud (AWS S3 / Google Drive / Dropbox)
            </div>
            <div className="md:col-span-5 text-[#F6851B] flex items-center gap-1.5 mt-2 md:mt-0 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              VaultX Sovereign Protocol
            </div>
          </div>

          <div className="divide-y divide-[#2E3238]">
            {comparison.map((item) => (
              <div
                key={item.aspect}
                className="grid grid-cols-1 md:grid-cols-12 p-5 gap-4 items-center hover:bg-[#24272A]/50 transition-colors"
              >
                {/* Vector Name */}
                <div className="md:col-span-3 font-mono text-sm font-semibold text-[#F2F4F6]">
                  {item.aspect}
                </div>

                {/* Traditional Centralized */}
                <div className="md:col-span-4 flex items-start gap-2 text-xs text-[#848C96] leading-relaxed">
                  <span className="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{item.traditional}</span>
                </div>

                {/* VaultX Sovereign */}
                <div className="md:col-span-5 flex items-start gap-2 text-xs text-[#F2F4F6] leading-relaxed bg-[#F6851B]/10 md:bg-transparent p-3 md:p-0 rounded-xl border border-[#F6851B]/20 md:border-0">
                  <span className="text-[#F6851B] font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-[#F2F4F6] font-medium">{item.vaultx}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
