import React from "react";
import { Shield, Lock, Database, KeyRound, UserCheck, EyeOff } from "lucide-react";

export function SecurityFeatures() {
  const features = [
    {
      title: "Client-Side Encryption",
      subtitle: "AES-256-GCM Authenticated Encryption",
      description:
        "Every byte of your data is encrypted directly inside your local browser. Encryption keys are generated with secure random entropy and never leave your hardware unencrypted.",
      icon: Lock,
      badge: "Zero-Knowledge",
    },
    {
      title: "Decentralized IPFS Storage",
      subtitle: "Content Addressing via Peer-to-Peer Network",
      description:
        "Encrypted files are pinned across decentralized storage nodes. Content-addressable hashes (CIDs) guarantee tamper-proof integrity and eliminate single points of failure.",
      icon: Database,
      badge: "Tamper-Proof",
    },
    {
      title: "Cryptographic Identity",
      subtitle: "Non-Custodial Web3 Signatures",
      description:
        "Eliminate passwords and centralized databases. Authenticate directly through standard EVM wallets with gas-free SIWE cryptographic signatures.",
      icon: KeyRound,
      badge: "Non-Custodial",
    },
    {
      title: "User-Controlled Access",
      subtitle: "Granular Key Envelope Sharing",
      description:
        "You define who has permission to decrypt each document. Generate access delegations or inspect recipient access without re-encrypting the underlying storage payload.",
      icon: UserCheck,
      badge: "Access Matrix",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-24 border-t border-slate-200/80 bg-white relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-[#2563EB]">
              <Shield className="h-3.5 w-3.5" />
              CYBERSECURITY ASSURANCES
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Security You Can Understand
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Designed from first principles to ensure your private files remain strictly confidential and cryptographically verified.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
            <EyeOff className="h-4 w-4 text-[#2563EB]" />
            <span>Zero telemetry: Plaintext never touches our servers</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs transition-all duration-200 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[#2563EB] font-semibold">
                    {feature.badge}
                  </span>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                    {feature.title}
                  </h3>
                  <div className="text-xs font-semibold text-slate-500">{feature.subtitle}</div>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
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
