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
      <div className="mb-6 flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 shadow-2xs">
        {(["upload", "retrieve"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            id={`vault-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200",
              activeTab === tab
                ? "bg-white text-slate-900 border border-slate-200/80 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            {tab === "upload" ? (
              <Upload className="h-4 w-4 text-[#2563EB]" />
            ) : (
              <Download className="h-4 w-4 text-[#2563EB]" />
            )}
            {tab === "upload" ? "Encrypt & Upload" : "Retrieve & Decrypt"}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm p-6 sm:p-8">
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
