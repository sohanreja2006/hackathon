import React from "react";
import { Wallet, Lock, Database, Share2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect MetaMask",
      description:
        "Authenticate using your MetaMask EVM wallet. Your public address acts as your sovereign decentralized identity without centralized passwords or credential leaks.",
      icon: Wallet,
      tag: "Sovereign Identity",
      accent: "text-[#F6851B]",
      borderHover: "hover:border-[#F6851B]/60",
    },
    {
      number: "02",
      title: "Encrypt Locally",
      description:
        "Your files are encrypted in-memory directly on your local device using high-performance AES-GCM-256 before any byte touches the network. Plaintext never leaves your machine.",
      icon: Lock,
      tag: "Client Cryptography",
      accent: "text-[#037DD6]",
      borderHover: "hover:border-[#037DD6]/60",
    },
    {
      number: "03",
      title: "Pin to IPFS",
      description:
        "The encrypted ciphertext is distributed across immutable peer-to-peer storage networks (IPFS via Pinata). Files are content-addressed and immune to single-server outages.",
      icon: Database,
      tag: "Distributed Storage",
      accent: "text-emerald-400",
      borderHover: "hover:border-emerald-500/60",
    },
    {
      number: "04",
      title: "Share Securely",
      description:
        "Grant granular read permissions to recipient wallet addresses using asymmetric public-key cryptography. Inspect active access grants at any moment.",
      icon: Share2,
      tag: "Access Matrix",
      accent: "text-[#F6851B]",
      borderHover: "hover:border-[#F6851B]/60",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 border-t border-[#2E3238] bg-[#141618] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3B4046] bg-[#1E2024] px-3.5 py-1 text-xs font-mono text-[#F6851B] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F6851B] animate-pulse" />
            CRYPTOGRAPHIC WORKFLOW
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F2F4F6]">
            How VaultX Works
          </h2>
          <p className="text-[#848C96] text-sm sm:text-base leading-relaxed">
            A frictionless zero-trust pipeline designed from the ground up to protect your most
            critical intellectual property, documents, and sensitive files.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`relative rounded-2xl border border-[#3B4046] bg-[#1E2024] p-6 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-[#24272A] shadow-md shadow-black/20 ${step.borderHover}`}
              >
                {/* Step Index Watermark */}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-[#24272A] border border-[#3B4046] shadow-inner">
                    <Icon className={`h-5 w-5 ${step.accent}`} />
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#3B4046]">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#848C96] font-semibold">
                    {step.tag}
                  </span>
                  <h3 className="text-lg font-semibold text-[#F2F4F6]">{step.title}</h3>
                  <p className="text-xs text-[#848C96] leading-relaxed">
                    {step.description}
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
