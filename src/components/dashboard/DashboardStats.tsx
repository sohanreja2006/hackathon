"use client";

import React, { useEffect, useState } from "react";
import { FileBox, Lock, HardDrive, Share2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAccount } from "wagmi";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { getAllVaultFiles, getSharedWithMeFiles } from "@/lib/fileStorage";
import { formatBytes } from "@/lib/crypto";

export function DashboardStats() {
  const { address } = useAccount();
  const { identity: vaultXIdentity } = useVaultXWallet();

  const [totalFiles, setTotalFiles] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [sharedCount, setSharedCount] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      const files = getAllVaultFiles([address, vaultXIdentity?.id]);
      const shared = address ? getSharedWithMeFiles(address) : [];
      setTotalFiles(files.length);
      const bytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
      setTotalBytes(bytes);
      setSharedCount(shared.length);
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
    <div className="stat-cards-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="My Vault Files"
        value={totalFiles}
        subtitle="Pinned to decentralized IPFS"
        icon={FileBox}
        badge="Zero-Knowledge"
        badgeVariant="cyber"
      />

      <StatCard
        title="Encrypted Files"
        value={totalFiles}
        subtitle="Client-side AES-256-GCM"
        icon={Lock}
        badge="100% Protected"
        badgeVariant="cyber"
      />

      <StatCard
        title="Storage Pinned"
        value={formatBytes(totalBytes)}
        subtitle="Distributed IPFS network"
        icon={HardDrive}
        badge="P2P Pinata"
        badgeVariant="success"
      />

      <StatCard
        title="Shared With Me"
        value={sharedCount}
        subtitle="Peer-to-peer access grants"
        icon={Share2}
        badge={sharedCount > 0 ? "Active Grants" : "No Peers"}
        badgeVariant={sharedCount > 0 ? "warning" : "default"}
      />
    </div>
  );
}
