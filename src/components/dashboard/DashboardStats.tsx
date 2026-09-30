"use client";

import React, { useEffect, useState } from "react";
import { Lock, HardDrive, ArrowUpCircle, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAccount } from "wagmi";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { getAllVaultFiles } from "@/lib/fileStorage";
import { formatBytes } from "@/lib/crypto";

export function DashboardStats() {
  const { address } = useAccount();
  const { identity: vaultXIdentity } = useVaultXWallet();

  const [totalFiles, setTotalFiles] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      const files = getAllVaultFiles([address, vaultXIdentity?.id]);
      setTotalFiles(files.length);
      const bytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
      setTotalBytes(bytes);
    };

    updateStats();
    window.addEventListener("focus", updateStats);
    window.addEventListener("storage", updateStats);
    return () => {
      window.removeEventListener("focus", updateStats);
      window.removeEventListener("storage", updateStats);
    };
  }, [address, vaultXIdentity]);

  return (
    <div className="stat-cards-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Encrypted Files */}
      <StatCard
        title="Encrypted Files"
        value={totalFiles}
        icon={Lock}
        iconColor="text-[#2563EB]"
      />

      {/* 2. Encrypted Storage */}
      <StatCard
        title="Encrypted Storage"
        value={formatBytes(totalBytes)}
        icon={HardDrive}
        iconColor="text-[#2563EB]"
      />

      {/* 3. Active Uploads */}
      <StatCard
        title="Active Uploads"
        value={0}
        icon={ArrowUpCircle}
        iconColor="text-[#2563EB]"
      />

      {/* 4. Integrity Status */}
      <StatCard
        title="Integrity Status"
        value="Good"
        icon={ShieldCheck}
        iconColor="text-emerald-600"
        badge="SHA-256"
        badgeVariant="success"
      />
    </div>
  );
}
