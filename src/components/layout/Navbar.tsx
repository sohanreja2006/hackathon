"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X, LayoutDashboard, KeyRound, Lock, Shield } from "lucide-react";
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
    { label: "Why CYBER-10", href: "/#why-cyber10" },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: isAuthenticated ? "Verified" : isConnected ? "Auth Required" : undefined,
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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-zinc-900 shadow-sm shadow-cyan-500/20 group-hover:border-cyan-400">
            <ShieldCheck className="h-5 w-5 text-cyan-400 transition-transform duration-200 group-hover:scale-110" />
            <div className="absolute inset-0 -z-10 rounded-lg bg-cyan-500/10 blur-sm group-hover:bg-cyan-500/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-base font-bold tracking-wider text-zinc-100">
              CYBER<span className="text-cyan-400">-10</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
              Zero-Trust Storage
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-900/50 px-3 py-1 text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  isActive
                    ? "text-cyan-300 bg-cyan-950/60 border border-cyan-500/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-mono border",
                      link.badgeColor === "emerald"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-950/60 transition-colors"
              title="Sign in with your connected wallet"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 focus:outline-none"
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
        <div className="sm:hidden border-b border-zinc-800/90 bg-zinc-950/95 px-4 pt-3 pb-5 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
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
                    "flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-cyan-950/50 text-cyan-300 border border-cyan-500/30"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-cyan-400" />}
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-mono border",
                        link.badgeColor === "emerald"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
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
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 py-2.5 text-xs font-mono text-amber-300"
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
