"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ReceiveSecureFileModal } from "@/components/dashboard/ReceiveSecureFileModal";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default function ShareRecipientPage({ params }: SharePageProps) {
  const { id: rawId } = use(params);
  const router = useRouter();
  const shareId = rawId ? decodeURIComponent(rawId) : "";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {shareId ? (
        <ReceiveSecureFileModal
          isOpen={true}
          onClose={() => router.push("/dashboard")}
          initialCode={shareId}
        />
      ) : (
        <div className="text-xs text-slate-500 font-mono">Loading SecureVault Share Gateway...</div>
      )}
    </div>
  );
}
