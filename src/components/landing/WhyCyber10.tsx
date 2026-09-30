import React from "react";
import { ShieldAlert, Unlock, ShieldCheck } from "lucide-react";

export function WhyCyber10() {
  const comparison = [
    {
      aspect: "Encryption Ownership",
      traditional: "Server-side encryption keys managed by the cloud vendor.",
      traditionalVulnerable: true,
      cyber10: "Client-side AES-GCM-256 with keys derived exclusively from your wallet.",
      cyber10Safe: true,
    },
    {
      aspect: "Data Custody",
      traditional: "Centralized database servers subject to subpoena, rogue employees, and leaks.",
      traditionalVulnerable: true,
      cyber10: "Immutable peer-to-peer storage (IPFS). Zero central server repository.",
      cyber10Safe: true,
    },
    {
      aspect: "Identity & Access",
      traditional: "Vulnerable passwords, SMS 2FA sim-swaps, and corporate email tracking.",
      traditionalVulnerable: true,
      cyber10: "Cryptographic EVM wallet signatures and non-custodial address identity.",
      cyber10Safe: true,
    },
    {
      aspect: "Downtime & Censorship",
      traditional: "Single point of failure. Cloud outages or account de-platforming lock your data.",
      traditionalVulnerable: true,
      cyber10: "Content-addressed distributed swarm replication with high availability.",
      cyber10Safe: true,
    },
  ];

  return (
    <section id="why-cyber10" className="py-20 md:py-28 border-t border-zinc-800/60 bg-zinc-950/70 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/30 px-3 py-1 text-xs font-mono text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            PARADIGM SHIFT
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Why CYBER-10 Matters
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Centralized cloud providers claim your data is safe, yet billions of records leak annually.
            CYBER-10 replaces vendor trust with mathematical cryptographic certainty.
          </p>
        </div>

        {/* Comparison Table / Card Matrix */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-zinc-800 bg-zinc-900/80 p-4 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <div className="md:col-span-3 font-semibold text-zinc-300">Architecture Vector</div>
            <div className="md:col-span-4 text-rose-400 flex items-center gap-1.5 mt-2 md:mt-0">
              <Unlock className="h-3.5 w-3.5" />
              Traditional Cloud (Google Drive / AWS S3 / Dropbox)
            </div>
            <div className="md:col-span-5 text-cyan-400 flex items-center gap-1.5 mt-2 md:mt-0">
              <ShieldCheck className="h-3.5 w-3.5" />
              CYBER-10 Protocol
            </div>
          </div>

          <div className="divide-y divide-zinc-800/70">
            {comparison.map((item) => (
              <div
                key={item.aspect}
                className="grid grid-cols-1 md:grid-cols-12 p-5 gap-4 items-center hover:bg-zinc-900/30 transition-colors"
              >
                {/* Vector Name */}
                <div className="md:col-span-3 font-mono text-sm font-semibold text-zinc-200">
                  {item.aspect}
                </div>

                {/* Traditional Centralized */}
                <div className="md:col-span-4 flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                  <span className="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{item.traditional}</span>
                </div>

                {/* CYBER-10 */}
                <div className="md:col-span-5 flex items-start gap-2 text-xs text-zinc-200 leading-relaxed bg-cyan-950/20 md:bg-transparent p-3 md:p-0 rounded-lg border border-cyan-500/20 md:border-0">
                  <span className="text-cyan-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-cyan-100 font-medium">{item.cyber10}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
