"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X, LayoutDashboard, KeyRound, Lock, Shield, LogOut } from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, isAuthenticated, signInWithWallet, authStage } = useAuthStatus();
  const { isGoogleAuthenticated, googleUser, googleSignOut } = useGoogleAuth();
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
            <span className="navbar-subtitle text-[10px] uppercase font-mono tracking-widest text-zinc-500">
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
                  "nav-pill-link relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
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
          {isConnected && !isAuthenticated && !isGoogleAuthenticated && (
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

          {/* Google user indicator */}
          {isGoogleAuthenticated && googleUser && (
            <div className="flex items-center gap-2">
              {googleUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={googleUser.image}
                  alt={googleUser.name ?? "Google"}
                  className="h-7 w-7 rounded-full border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {googleUser.name?.[0] ?? "G"}
                </div>
              )}
              <span className="text-xs text-zinc-300 font-medium hidden lg:block">
                {googleUser.name?.split(" ")[0]}
              </span>
              <button
                onClick={() => googleSignOut("/")}
                className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Google sign-in link when not authenticated at all */}
          {!isGoogleAuthenticated && !isAuthenticated && (
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Sign in</span>
            </Link>
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

            {/* Google Authentication (Mobile) */}
            {isGoogleAuthenticated && googleUser ? (
              <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  {googleUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={googleUser.image}
                      alt={googleUser.name ?? "Google"}
                      className="h-8 w-8 rounded-full border border-zinc-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {googleUser.name?.[0] ?? "G"}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-zinc-200 truncate">{googleUser.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono truncate">{googleUser.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    googleSignOut("/");
                  }}
                  className="px-2.5 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 shrink-0"
                >
                  Sign Out
                </button>
              </div>
            ) : !isAuthenticated ? (
              <Link
                href="/auth/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Sign in with Google</span>
              </Link>
            ) : null}

            {isConnected && !isAuthenticated && !isGoogleAuthenticated && (
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
