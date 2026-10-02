"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Bell,
  Check,
} from "lucide-react";
import {
  fetchPendingApprovalsApi,
  respondToAccessRequestApi,
} from "@/lib/payloadClient";

export interface PendingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultXId?: string | null;
  onRequestCountChange?: (count: number) => void;
}

export function PendingApprovalsModal({
  isOpen,
  onClose,
  vaultXId,
  onRequestCountChange,
}: PendingApprovalsModalProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const res = await fetchPendingApprovalsApi(vaultXId);
        if (res.success) {
          setRequests(res.requests);
          const pendingCount = res.requests.filter(
            (r: any) => r.status === "pending"
          ).length;
          onRequestCountChange?.(pendingCount);
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err) {
        console.error("Failed to load pending approvals:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [vaultXId, onRequestCountChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    loadRequests(true);

    // Auto-refresh every 4 seconds while modal is open
    const interval = setInterval(() => {
      loadRequests(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, loadRequests]);

  const handleAction = async (requestId: string, action: "approve" | "deny") => {
    setProcessingId(requestId);
    setError(null);
    setActionSuccess(null);

    const res = await respondToAccessRequestApi(requestId, action, vaultXId);

    if (res.success) {
      setActionSuccess(
        action === "approve"
          ? "Access request approved! The recipient can now decrypt the file."
          : "Access request denied."
      );
      // Remove or update the resolved request in local state immediately
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: action === "approve" ? "approved" : "denied" }
            : r
        )
      );
      const remainingPending = requests.filter(
        (r) => r.id !== requestId && r.status === "pending"
      ).length;
      onRequestCountChange?.(remainingPending);
    } else {
      setError(res.error || `Failed to ${action} request.`);
    }

    setProcessingId(null);
  };

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] shadow-xs border border-blue-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Access Approvals
                </h3>
                {pendingRequests.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                    {pendingRequests.length} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Approve or deny recipients requesting access to your shared files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                loadRequests(false);
              }}
              title="Refresh requests"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action feedback */}
        {actionSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
              <p className="text-xs font-medium">Checking for access requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100">
                <Check className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                No Pending Requests
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                When someone clicks your shared link and requests access, their request will appear here for your verification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block px-1">
                Pending Verification ({pendingRequests.length})
              </span>

              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 hover:border-amber-300 transition-all space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#2563EB] shrink-0" />
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {req.fileName || "Encrypted File"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {req.shareCode}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(req.requestedAt)}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      Pending
                    </span>
                  </div>

                  {/* Requester Identity */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-500">Requester:</span>
                      <span className="font-mono font-bold text-slate-800 truncate">
                        {req.requesterAddress
                          ? `${req.requesterAddress.slice(0, 8)}...${req.requesterAddress.slice(-6)}`
                          : "Anonymous Web Recipient"}
                      </span>
                    </div>

                    {req.requesterNote && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        &ldquo;{req.requesterNote}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, "deny")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Deny
                    </button>

                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, "approve")}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently resolved requests history */}
          {resolvedRequests.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block px-1">
                Recent Decisions ({resolvedRequests.length})
              </span>
              <div className="space-y-2">
                {resolvedRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-800">{req.fileName}</span>
                      <span className="text-slate-400 ml-2 font-mono text-[10px]">
                        {req.requesterAddress
                          ? `${req.requesterAddress.slice(0, 6)}...`
                          : "Anonymous"}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        req.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {req.status === "approved" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {req.status === "approved" ? "Approved" : "Denied"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Bell className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Recipients unlock automatically when you approve</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
