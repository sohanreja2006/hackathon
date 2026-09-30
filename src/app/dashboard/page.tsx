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

        {/* Action Banner — Phase 3 Live */}
        <div className="mb-8 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-zinc-900/60 to-zinc-900/40 p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-cyan-400" />
                Client-Side AES-256-GCM Encryption
              </span>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/30">
                Phase 3 · Live
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Encrypt or decrypt any file locally in your browser. Your plaintext never leaves your device.
            </p>
          </div>

          <Link
            href="/dashboard/encrypt"
            className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md px-3 text-xs relative overflow-hidden bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-zinc-950 font-semibold hover:brightness-110 active:scale-[0.98] shadow-md shadow-cyan-950/40 border border-cyan-400/30 shrink-0 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Encrypt a File</span>
          </Link>
        </div>

        {/* Action Banner — Phase 4 Live: Encrypted IPFS Vault */}
        <div className="mb-8 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-zinc-900/60 to-zinc-900/40 p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-violet-400" />
                Encrypt & Store on IPFS
              </span>
              <span className="text-[10px] font-mono uppercase bg-violet-500/20 px-2 py-0.5 rounded text-violet-300 border border-violet-500/30">
                Phase 4 · Live
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Encrypt a file and upload the ciphertext to decentralized IPFS storage via Pinata. Get a permanent CID.
            </p>
          </div>

          <Link
            href="/dashboard/vault"
            className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md px-3 text-xs relative overflow-hidden bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-500 text-white font-semibold hover:brightness-110 active:scale-[0.98] shadow-md shadow-violet-950/40 border border-violet-400/30 shrink-0 transition-all duration-200"
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
