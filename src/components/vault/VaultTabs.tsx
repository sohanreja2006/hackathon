"use client";

import React, { useState } from "react";
import { Upload, Download } from "lucide-react";
import { VaultUploadPanel } from "@/components/vault/VaultUploadPanel";
import { VaultRetrievePanel } from "@/components/vault/VaultRetrievePanel";
import { cn } from "@/lib/utils";

type Tab = "upload" | "retrieve";

export function VaultTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  return (
    <div className="panel-max-w w-full max-w-2xl mx-auto">
      {/* Tab switcher */}
      <div className="mb-6 flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {(["upload", "retrieve"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            id={`vault-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200",
              activeTab === tab
                ? tab === "upload"
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/30"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab === "upload" ? (
              <Upload className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {tab === "upload" ? "Encrypt & Upload" : "Retrieve & Decrypt"}
          </button>
        ))}
      </div>

      {/* Panel content — always mounted to preserve state on tab switch */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-xl p-6">
        <div className={activeTab === "upload" ? "block" : "hidden"}>
          <VaultUploadPanel />
        </div>
        <div className={activeTab === "retrieve" ? "block" : "hidden"}>
          <VaultRetrievePanel />
        </div>
      </div>
    </div>
  );
}
