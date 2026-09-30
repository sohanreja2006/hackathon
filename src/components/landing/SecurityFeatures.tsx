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
      accent: "text-[#F6851B]",
    },
    {
      title: "Decentralized IPFS Storage",
      subtitle: "Distributed Content Addressing via Pinata",
      description:
        "Encrypted files are pinned across peer-to-peer storage nodes. Content-addressable hashes (CIDs) guarantee tamper-proof integrity and eliminate single points of failure.",
      icon: Database,
      badge: "Tamper-Proof",
      accent: "text-[#037DD6]",
    },
    {
      title: "MetaMask Sovereign Identity",
      subtitle: "Non-Custodial Web3 Sovereign Auth",
      description:
        "Eliminate insecure username-password databases and SMS two-factor exploits. Authenticate directly through standard EVM wallets with SIWE cryptographic signatures.",
      icon: KeyRound,
      badge: "Non-Custodial",
      accent: "text-[#F6851B]",
    },
    {
      title: "User-Controlled Access",
      subtitle: "Cryptographic Granular Sharing",
      description:
        "You define who has permission to decrypt each document. Generate access delegations or inspect recipient access instantaneously without re-encrypting the underlying storage payload.",
      icon: UserCheck,
      badge: "Access Matrix",
      accent: "text-emerald-400",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-28 border-t border-[#2E3238] bg-[#141618] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3B4046] bg-[#1E2024] px-3.5 py-1 text-xs font-mono text-[#F6851B] shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              CYBERSECURITY ASSURANCES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F2F4F6]">
              Engineered for Zero-Trust Environments
            </h2>
            <p className="text-[#848C96] text-sm sm:text-base leading-relaxed">
              Designed from first principles to withstand rogue infrastructure providers,
              interception, and modern credential-stuffing exploits.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-[#3B4046] bg-[#1E2024] p-3 text-xs font-mono text-[#848C96] shadow-sm">
            <EyeOff className="h-4 w-4 text-[#F6851B]" />
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
                className="group rounded-2xl border border-[#3B4046] bg-[#1E2024] p-6 md:p-8 backdrop-blur-md transition-all duration-200 hover:border-[#F6851B]/50 hover:bg-[#24272A] shadow-md shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-11 w-11 rounded-xl border border-[#3B4046] bg-[#24272A] flex items-center justify-center shadow-inner">
                    <Icon className={`h-5 w-5 ${feature.accent}`} />
                  </div>
                  <span className="font-mono text-[11px] rounded-full border border-[#3B4046] bg-[#24272A] px-3 py-0.5 text-[#848C96] font-semibold">
                    {feature.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-[#F2F4F6] group-hover:text-[#F6851B] transition-colors">
                    {feature.title}
                  </h3>
                  <div className="text-xs font-mono text-[#F6851B]/90 font-medium">{feature.subtitle}</div>
                  <p className="text-sm text-[#848C96] leading-relaxed pt-1">
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
