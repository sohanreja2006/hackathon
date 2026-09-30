import React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentFiles } from "@/components/dashboard/RecentFiles";
import { SecurityStatus } from "@/components/dashboard/SecurityStatus";
import { 
  UploadCloud, 
  Plus,
  Shield
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vault Dashboard | CYBER-10 Decentralized Storage",
  description: "Manage your client-encrypted files, IPFS decentralized pins, and sovereign access grants.",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Dashboard Header with connected address and network */}
        <DashboardHeader />

        {/* Security / Cryptographic Engine Telemetry */}
        <SecurityStatus />

        {/* Main Dashboard Dynamic Stat Cards */}
        <DashboardStats />

        {/* Action Banner — Client-Side Encryption */}
        <div className="action-banner mb-6 rounded-2xl border border-[#3b4046] bg-[#1e2024] p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20 hover:border-[#f6851b]/40 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#f2f4f6] flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-[#f6851b]" />
                Client-Side AES-256-GCM Encryption
              </span>
              <span className="text-[10px] font-mono uppercase bg-[#f6851b]/15 px-2 py-0.5 rounded-full text-[#f6851b] border border-[#f6851b]/30 font-semibold">
                Protected
              </span>
            </div>
            <p className="text-xs text-[#848c96]">
              Encrypt or decrypt any file locally in your browser. Your plaintext never leaves your device.
            </p>
          </div>

          <Link
            href="/dashboard/encrypt"
            className="action-banner-btn inline-flex items-center justify-center gap-1.5 h-9 rounded-xl px-4 text-xs bg-[#f6851b] hover:bg-[#e2761b] active:bg-[#cd6116] text-[#141618] font-bold shadow-md shadow-[#f6851b]/20 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Encrypt a File</span>
          </Link>
        </div>

        {/* Action Banner — Encrypted IPFS Vault */}
        <div className="action-banner mb-8 rounded-2xl border border-[#3b4046] bg-[#1e2024] p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20 hover:border-[#037dd6]/40 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#f2f4f6] flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-[#037dd6]" />
                Encrypt & Store on Decentralized IPFS
              </span>
              <span className="text-[10px] font-mono uppercase bg-[#037dd6]/15 px-2 py-0.5 rounded-full text-[#038ff0] border border-[#037dd6]/30 font-semibold">
                Pinata IPFS
              </span>
            </div>
            <p className="text-xs text-[#848c96]">
              Encrypt a file and upload ciphertext to decentralized IPFS storage. Retrieve anytime with your key.
            </p>
          </div>

          <Link
            href="/dashboard/vault"
            className="action-banner-btn inline-flex items-center justify-center gap-1.5 h-9 rounded-xl px-4 text-xs bg-[#037dd6] hover:bg-[#038ff0] text-white font-bold shadow-md shadow-[#037dd6]/20 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Open Vault</span>
          </Link>
        </div>

        {/* Recent Files Table Component */}
        <RecentFiles />
      </div>
    </ProtectedRoute>
  );
}
