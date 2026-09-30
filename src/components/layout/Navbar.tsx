"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, KeyRound, Lock, Shield } from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, isAuthenticated, signInWithWallet, authStage } = useAuthStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/" },
    { label: "Architecture", href: "/#how-it-works" },
    { label: "Security", href: "/#security" },
    { label: "Why VaultX", href: "/#why-cyber10" },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: isAuthenticated ? "Verified" : isConnected ? "Sign In" : undefined,
      badgeColor: isAuthenticated ? "emerald" : "amber",
    },
    {
      label: "Encrypt",
      href: "/dashboard/encrypt",
      icon: Lock,
      badge: isAuthenticated ? "AES-256" : undefined,
      badgeColor: "emerald" as const,
    },
    {
      label: "Vault",
      href: "/dashboard/vault",
      icon: Shield,
      badge: isAuthenticated ? "IPFS" : undefined,
      badgeColor: "emerald" as const,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2e3238] bg-[#141618]/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* MetaMask Style Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform duration-200 active:scale-95"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f6851b] to-[#cd6116] shadow-md shadow-[#f6851b]/25 text-xl border border-[#f6851b]/50 transition-transform duration-200 group-hover:scale-105">
            🦊
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#f2f4f6] flex items-center gap-1.5 font-sans">
              Vault<span className="text-[#f6851b]">X</span>
              <span className="rounded-full bg-[#f6851b]/15 border border-[#f6851b]/35 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#f6851b]">
                METAMASK
              </span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-[#848c96] uppercase">
              Sovereign Web3 Vault
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links — MetaMask Portfolio Style */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-[#2e3238] bg-[#1e2024]/80 px-2 py-1 text-sm shadow-inner">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "nav-pill-link relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "text-[#f2f4f6] bg-[#2b2f34] border border-[#3b4046] shadow-sm"
                    : "text-[#848c96] hover:text-[#f2f4f6] hover:bg-[#2b2f34]/50"
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? "text-[#f6851b]" : "text-[#848c96]"
                    )}
                  />
                )}
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-mono border",
                      link.badgeColor === "emerald"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-[#f6851b]/10 text-[#f6851b] border-[#f6851b]/30"
                    )}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action: Wallet Connection & Quick Auth Indicator */}
        <div className="hidden sm:flex items-center gap-3">
          {isConnected && !isAuthenticated && (
            <button
              onClick={() => signInWithWallet()}
              disabled={authStage === "awaiting_signature" || authStage === "verifying"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#f6851b]/40 bg-[#f6851b]/15 px-3 py-1.5 text-xs font-mono text-[#f6851b] hover:bg-[#f6851b]/25 transition-colors font-semibold"
              title="Sign in with your connected wallet"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#f6851b]" />
              <span>Verify Ownership</span>
            </button>
          )}

          <WalletConnectButton size="default" />
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <WalletConnectButton size="sm" showNetworkBadge={false} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3b4046] bg-[#1e2024] text-[#f2f4f6] hover:bg-[#24272a] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[#2e3238] bg-[#141618]/95 px-4 pt-3 pb-5 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-[#2b2f34] text-[#f2f4f6] border border-[#3b4046]"
                      : "text-[#848c96] hover:bg-[#1e2024] hover:text-[#f2f4f6]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-[#f6851b]" : "text-[#848c96]"
                        )}
                      />
                    )}
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-mono border",
                        link.badgeColor === "emerald"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-[#f6851b]/20 text-[#f6851b] border-[#f6851b]/30"
                      )}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {isConnected && !isAuthenticated && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signInWithWallet();
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#f6851b]/40 bg-[#f6851b]/15 py-2.5 text-xs font-mono text-[#f6851b] font-semibold"
              >
                <KeyRound className="h-4 w-4" />
                <span>Verify Ownership (Sign In)</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
