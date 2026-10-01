"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, KeyRound, Menu, X, Check, Copy } from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { formatAddress, cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, isAuthenticated, address, chainName, signInWithWallet, authStage } = useAuthStatus();
  const { isConnected: isVxConnected, identity } = useVaultXWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeAddress = (isVxConnected && identity?.id) ? identity.id : address;

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
          className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95"
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
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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
            <div className="flex items-center gap-2">
              {/* Address Pill */}
              <button
                onClick={handleCopy}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                title="Click to copy address"
              >
                <span className="text-sm">{isVxConnected ? "🔒" : "🦊"}</span>
                <span>{formatAddress(activeAddress, 5)}</span>
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
              </button>

              {/* Network Pill */}
              <div className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
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

              <WalletConnectButton size="sm" showNetworkBadge={false} />
            </div>
          ) : (
            /* Not Connected: Solid Blue "Connect Wallet" Pill Button */
            <WalletConnectButton size="default" />
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
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
          </nav>
        </div>
      )}
    </header>
  );
}
