"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, KeyRound, Menu, X, Check, Copy, Bell } from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { formatAddress, cn } from "@/lib/utils";
import { PendingApprovalsModal } from "@/components/dashboard/PendingApprovalsModal";
import { fetchPendingApprovalsApi } from "@/lib/payloadClient";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, isAuthenticated, address, chainName, signInWithWallet, authStage } = useAuthStatus();
  const { isConnected: isVxConnected, identity } = useVaultXWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const activeAddress = (isVxConnected && identity?.id) ? identity.id : address;

  useEffect(() => {
    if (!activeAddress) return;
    const pollApprovals = async () => {
      try {
        const res = await fetchPendingApprovalsApi(activeAddress);
        if (res.success && Array.isArray(res.requests)) {
          const pending = res.requests.filter((r: any) => r.status === "pending").length;
          setPendingCount(pending);
        }
      } catch {
        // silent
      }
    };
    pollApprovals();
    const interval = setInterval(pollApprovals, 5000);
    return () => clearInterval(interval);
  }, [activeAddress]);

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Security", href: "/#security" },
    { label: "Receive", href: "/receive" },
    { label: "Vault", href: "/dashboard" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* SecureVault Logo */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 transition-transform duration-200 active:scale-95"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/20">
            <Shield className="h-5 w-5 fill-white/20" />
            <span className="absolute text-[10px]">🦉</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            Secure<span className="text-[#2563EB]">Vault</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs lg:text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-[#2563EB]",
                  isActive ? "text-[#2563EB] font-semibold" : "text-slate-600"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* If Connected & Authenticated: Show pills like Screen 4 */}
          {((isVxConnected && !!identity) || isConnected) && activeAddress ? (
            <div className="flex items-center gap-2 shrink-0">
              {/* Address Pill (shown on xl screens; on smaller screens WalletConnectButton shows address) */}
              <button
                onClick={handleCopy}
                type="button"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                title="Click to copy address"
              >
                <span className="text-sm">{isVxConnected ? "🔒" : "🦊"}</span>
                <span>{formatAddress(activeAddress, 5)}</span>
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
              </button>

              {/* Network Pill */}
              <div className="hidden lg:inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>{isVxConnected ? "Local Vault" : (chainName || "Sepolia")}</span>
              </div>

              {/* Authenticated Pill */}
              {isAuthenticated || isVxConnected ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Authenticated</span>
                </div>
              ) : (
                <button
                  onClick={() => signInWithWallet()}
                  disabled={authStage === "awaiting_signature" || authStage === "verifying"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] px-3.5 py-1 text-xs font-semibold text-white shadow-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Verify Identity</span>
                </button>
              )}

              {/* Approvals Bell / Pill */}
              <button
                type="button"
                onClick={() => setIsApprovalsOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  pendingCount > 0
                    ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse shadow-amber-500/30"
                    : "border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
                title="Access Approvals"
              >
                <Bell className={`h-3.5 w-3.5 ${pendingCount > 0 ? "text-white" : "text-[#2563EB]"}`} />
                <span>Approvals</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-amber-600">
                    {pendingCount}
                  </span>
                )}
              </button>

              <WalletConnectButton size="sm" showNetworkBadge={false} />
            </div>
          ) : (
            /* Not Connected: Solid Blue "Connect Wallet" Pill Button */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsApprovalsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                title="Access Approvals"
              >
                <Bell className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Approvals</span>
              </button>
              <WalletConnectButton size="default" />
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setIsApprovalsOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 relative"
            title="Approvals"
          >
            <Bell className="h-4 w-4 text-[#2563EB]" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <WalletConnectButton size="sm" showNetworkBadge={false} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>{link.label}</span>
              </Link>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsApprovalsOpen(true);
              }}
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#2563EB]" />
                <span>Access Approvals</span>
              </span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  {pendingCount} pending
                </span>
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Global Pending Approvals Modal */}
      <PendingApprovalsModal
        isOpen={isApprovalsOpen}
        onClose={() => setIsApprovalsOpen(false)}
        vaultXId={activeAddress}
        onRequestCountChange={setPendingCount}
      />
    </header>
  );
}
