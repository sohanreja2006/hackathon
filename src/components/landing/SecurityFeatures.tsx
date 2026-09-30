import React from "react";
import { Shield, Lock, Database, KeyRound, UserCheck, EyeOff } from "lucide-react";

export function SecurityFeatures() {
  const features = [
    {
      title: "Client-Side Encryption",
      subtitle: "AES-GCM-256 + Authenticated Cryptography",
      description:
        "Every byte of your data is encrypted directly inside your local browser runtime. Cryptographic keys are generated with secure random entropy and never leave your hardware unencrypted.",
      icon: Lock,
      badge: "Zero-Knowledge",
      badgeColor: "cyber",
      accent: "text-cyan-400",
      border: "border-cyan-500/20",
    },
    {
      title: "Decentralized Storage",
      subtitle: "Distributed IPFS Content Addressing",
      description:
        "Files are sharded and pinned across peer-to-peer storage nodes. Content-addressable hashes (CIDs) guarantee tamper-proof integrity and eliminate single points of failure.",
      icon: Database,
      badge: "Tamper-Proof",
      badgeColor: "success",
      accent: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    {
      title: "Wallet-Based Identity",
      subtitle: "Non-Custodial Web3 Sovereign Auth",
      description:
        "Eliminate insecure username-password databases and SMS two-factor exploits. Authenticate directly through standard EVM wallets (MetaMask, Rainbow, Coinbase, WalletConnect).",
      icon: KeyRound,
      badge: "Non-Custodial",
      badgeColor: "purple",
      accent: "text-purple-400",
      border: "border-purple-500/20",
    },
    {
      title: "User-Controlled Access",
      subtitle: "Cryptographic Granular Sharing",
      description:
        "You define who has permission to decrypt each document. Generate time-bound access delegations or revoke recipient access instantaneously without re-encrypting the underlying storage payload.",
      icon: UserCheck,
      badge: "Access Matrix",
      badgeColor: "cyber",
      accent: "text-teal-400",
      border: "border-teal-500/20",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-28 border-t border-zinc-800/60 bg-zinc-950 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-mono text-cyan-300">
              <Shield className="h-3.5 w-3.5" />
              CYBERSECURITY ASSURANCES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Engineered for Zero-Trust Environments
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Designed from first principles to withstand rogue infrastructure providers,
              state-sponsored interception, and modern credential-stuffing attacks.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs font-mono text-zinc-400">
            <EyeOff className="h-4 w-4 text-cyan-400" />
            <span>Zero Telemetry Exposure Guarantee</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`group rounded-xl border ${feature.border} bg-zinc-900/50 p-6 md:p-8 backdrop-blur-md transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-11 w-11 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${feature.accent}`} />
                  </div>
                  <span className="font-mono text-[11px] rounded-full border border-zinc-700/60 bg-zinc-800/80 px-2.5 py-0.5 text-zinc-300">
                    {feature.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                    {feature.title}
                  </h3>
                  <div className="text-xs font-mono text-cyan-400/90">{feature.subtitle}</div>
                  <p className="text-sm text-zinc-400 leading-relaxed pt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
