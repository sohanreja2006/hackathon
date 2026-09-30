import React from "react";
import { Wallet, Lock, Database, Share2, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect Wallet",
      description:
        "Authenticate using your Web3 wallet. Your public address acts as your decentralized identity. SecureVault never asks for private keys or recovery phrases.",
      icon: Wallet,
      tag: "Sovereign Identity",
    },
    {
      number: "02",
      title: "Encrypt Locally",
      description:
        "Your files are encrypted in-memory directly on your device using AES-256-GCM before any byte touches the network. Plaintext never leaves your machine.",
      icon: Lock,
      tag: "Client-Side Cryptography",
    },
    {
      number: "03",
      title: "Store on IPFS",
      description:
        "The encrypted ciphertext chunks are stored across decentralized IPFS storage. Content-addressed hashes ensure integrity and zero single-server dependencies.",
      icon: Database,
      tag: "Decentralized IPFS",
    },
    {
      number: "04",
      title: "Share Securely",
      description:
        "Grant granular read permissions to recipient wallet addresses using cryptographic key envelopes. Plaintext remains strictly private and client-side.",
      icon: Share2,
      tag: "Zero-Knowledge Sharing",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-24 border-t border-slate-200/80 bg-slate-50/50 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-[#2563EB]">
            <span>CRYPTOGRAPHIC WORKFLOW</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            How SecureVault Works
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            A transparent zero-knowledge pipeline designed to protect your most critical files, documents, and sensitive data.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* Step Index & Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-2xl font-bold text-slate-300">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                    {step.tag}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassurance Callout */}
        <div className="mt-10 max-w-xl mx-auto text-center flex items-center justify-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-full py-2 px-4 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Factual Security: Plaintext never leaves your machine. Only encrypted data reaches storage.</span>
        </div>
      </div>
    </section>
  );
}
