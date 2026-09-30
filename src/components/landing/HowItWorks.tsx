import React from "react";
import { Wallet, Lock, Database, Share2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect Wallet",
      description:
        "Authenticate using your Web3 EVM wallet. Your public address acts as your sovereign decentralized identity without centralized passwords or email harvesters.",
      icon: Wallet,
      tag: "Identity",
      color: "from-cyan-500/20 to-cyan-500/5",
      border: "border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    {
      number: "02",
      title: "Encrypt Locally",
      description:
        "Your files are encrypted in-memory directly on your local device using high-performance AES-GCM-256 before any byte touches the network. Plaintext never leaves your machine.",
      icon: Lock,
      tag: "Client-Side Cryptography",
      color: "from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    {
      number: "03",
      title: "Store Decentralized",
      description:
        "The encrypted ciphertext is distributed across immutable peer-to-peer storage networks (IPFS). Files are content-addressed and immune to single-server outages or censorship.",
      icon: Database,
      tag: "Immutable IPFS",
      color: "from-teal-500/20 to-teal-500/5",
      border: "border-teal-500/30",
      iconColor: "text-teal-400",
    },
    {
      number: "04",
      title: "Share Securely",
      description:
        "Grant granular read permissions to recipient wallet addresses using asymmetric public-key cryptography. Revoke or inspect active access grants at any moment.",
      icon: Share2,
      tag: "Access Control",
      color: "from-purple-500/20 to-purple-500/5",
      border: "border-purple-500/30",
      iconColor: "text-purple-400",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 border-t border-zinc-800/60 bg-zinc-950/60 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-mono text-cyan-400">
            CRYPTOGRAPHIC WORKFLOW
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            How CYBER-10 Works
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            A frictionless zero-trust pipeline designed from the ground up to protect your most
            critical intellectual property, documents, and sensitive files.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`relative rounded-xl border ${step.border} bg-zinc-900/40 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-zinc-900/70`}
              >
                {/* Step Index Watermark */}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 shadow-inner">
                    <Icon className={`h-5 w-5 ${step.iconColor}`} />
                  </div>
                  <span className="font-mono text-2xl font-bold text-zinc-700">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    {step.tag}
                  </span>
                  <h3 className="text-lg font-semibold text-zinc-100">{step.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
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
