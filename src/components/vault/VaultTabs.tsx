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
      <div className="mb-6 flex rounded-2xl border border-[#3B4046] bg-[#141618] p-1.5 shadow-md">
        {(["upload", "retrieve"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            id={`vault-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200",
              activeTab === tab
                ? "bg-[#24272A] text-white border border-[#3B4046] shadow-sm"
                : "text-[#848C96] hover:text-[#F2F4F6]"
            )}
          >
            {tab === "upload" ? (
              <Upload className="h-4 w-4 text-[#F6851B]" />
            ) : (
              <Download className="h-4 w-4 text-[#037DD6]" />
            )}
            {tab === "upload" ? "Encrypt & Upload" : "Retrieve & Decrypt"}
          </button>
        ))}
      </div>

      {/* Panel content — always mounted to preserve state on tab switch */}
      <div className="rounded-2xl border border-[#3B4046] bg-[#1E2024] shadow-2xl p-6 sm:p-8">
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
