"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReceiveSecureFileModal } from "@/components/dashboard/ReceiveSecureFileModal";

function ReceiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <ReceiveSecureFileModal
        isOpen={true}
        onClose={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/dashboard");
          }
        }}
        initialCode={code}
      />
    </div>
  );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500">Loading Secure File Gateway...</div>}>
      <ReceiveContent />
    </Suspense>
  );
}
