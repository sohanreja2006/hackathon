"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  Key,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Copy,
  Check,
  Info,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useVaultXWallet } from "@/context/VaultXWalletContext";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { formatAddress, cn } from "@/lib/utils";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMetaMask: () => void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  onOpenMetaMask,
}: ConnectWalletModalProps) {
  const { address, isConnected: isMetaMaskConnected, disconnect: disconnectMetaMask } = useAuthStatus();
  const {
    identity,
    hasExistingWallet,
    isConnected: isVaultXConnected,
    isCreating,
    createWallet,
    unlockWallet,
    disconnectWallet,
  } = useVaultXWallet();
  const {
    googleUser,
    isGoogleAuthenticated,
    isGoogleLoading,
    googleSignIn,
    googleSignOut,
  } = useGoogleAuth();

  const [activeView, setActiveView] = useState<"choose" | "create" | "created_success" | "security_details">("choose");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedVxId, setCopiedVxId] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyMetaMask = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyVxId = () => {
    if (identity?.id) {
      navigator.clipboard.writeText(identity.id);
      setCopiedVxId(true);
      setTimeout(() => setCopiedVxId(false), 2000);
    }
  };

  const handleCreateVaultX = async () => {
    setErrorMsg(null);
    try {
      if (hasExistingWallet) {
        await unlockWallet();
      } else {
        await createWallet();
      }
      setActiveView("created_success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize VaultX Secure Wallet.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="modal-sheet responsive-modal relative w-full max-w-lg rounded-2xl border border-[#3B4046] bg-[#1E2024] p-6 md:p-8 shadow-2xl shadow-black/60 text-[#F2F4F6]">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── VIEW: CHOOSE HOW TO CONNECT ───────────────────────────────────── */}
        {activeView === "choose" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F6851B]/15 border border-[#F6851B]/30 flex items-center justify-center text-xl shrink-0">
                🦊
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Connect to VaultX
                </h2>
                <p className="mt-0.5 text-xs text-[#848C96]">
                  Dual-layer sovereign security: Google Account & MetaMask
                </p>
              </div>
            </div>

            {/* Connected Identity Summary Banner */}
            {(isMetaMaskConnected || isVaultXConnected || isGoogleAuthenticated) && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {(Number(isMetaMaskConnected) + Number(isVaultXConnected) + Number(isGoogleAuthenticated)) > 1
                      ? "Multi-Identity Connected"
                      : "Identity Connected"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                  {isGoogleAuthenticated && googleUser && (
                    <div className="flex items-center gap-2 bg-[#141618] p-2 rounded-lg border border-[#3B4046]">
                      {googleUser.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={googleUser.image}
                          alt="Google"
                          className="h-4 w-4 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-base">🌐</span>
                      )}
                      <span className="text-[#F2F4F6] font-sans truncate">{googleUser.name?.split(" ")[0] || "Google"}</span>
                    </div>
                  )}
                  {isMetaMaskConnected && address && (
                    <div className="flex items-center gap-2 bg-[#141618] p-2 rounded-lg border border-[#F6851B]/40">
                      <span className="text-base">🦊</span>
                      <span className="text-[#F6851B] font-semibold truncate">{formatAddress(address, 5)}</span>
                    </div>
                  )}
                  {isVaultXConnected && identity && (
                    <div className="flex items-center gap-2 bg-[#141618] p-2 rounded-lg border border-[#3B4046]">
                      <span className="text-base">🔐</span>
                      <span className="text-[#037DD6] font-bold truncate">{identity.id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Option 1: Google Account */}
              <div
                className={cn(
                  "rounded-2xl border p-4 transition-all duration-200",
                  isGoogleAuthenticated
                    ? "border-[#037DD6]/40 bg-[#037DD6]/10"
                    : "border-[#3B4046] bg-[#24272A]/70 hover:border-[#848C96]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">Google Account</h3>
                        {isGoogleAuthenticated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Authenticated
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#848C96]">
                        {isGoogleAuthenticated && googleUser
                          ? `Signed in as ${googleUser.email || googleUser.name}`
                          : "Fast OAuth 2.0 sign-in with your Google account"}
                      </p>
                      {isGoogleAuthenticated && googleUser && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#F2F4F6] bg-[#141618] px-2.5 py-1 rounded-lg border border-[#3B4046] w-fit">
                          {googleUser.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={googleUser.image}
                              alt="Avatar"
                              className="h-3.5 w-3.5 rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="font-sans">{googleUser.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isGoogleAuthenticated ? (
                      <button
                        onClick={() => googleSignOut("/")}
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-[#3B4046] bg-[#141618] text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button
                        onClick={() => googleSignIn("/dashboard")}
                        disabled={isGoogleLoading}
                        type="button"
                        className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <span>Sign in</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: MetaMask (Signature Spotlight) */}
              <div className={cn(
                "rounded-2xl border p-4 transition-all duration-200",
                isMetaMaskConnected
                  ? "border-[#F6851B]/50 bg-[#F6851B]/10"
                  : "border-[#F6851B]/30 bg-[#24272A] hover:border-[#F6851B]"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-[#F6851B]/15 border border-[#F6851B]/40 flex items-center justify-center text-xl">
                      🦊
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">MetaMask</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F6851B]/20 border border-[#F6851B]/40 px-2 py-0.5 text-[10px] font-semibold text-[#F6851B]">
                          Primary Web3
                        </span>
                        {isMetaMaskConnected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#848C96]">
                        Connect MetaMask for SIWE sovereign challenge & blockchain verification
                      </p>
                      {isMetaMaskConnected && address && (
                        <div className="mt-2 flex items-center gap-2 font-mono text-xs text-[#F2F4F6] bg-[#141618] px-2.5 py-1 rounded-lg border border-[#3B4046] w-fit">
                          <span className="text-[#F6851B] font-semibold">{formatAddress(address, 6)}</span>
                          <button onClick={handleCopyMetaMask} className="text-[#848C96] hover:text-[#F2F4F6]">
                            {copiedAddress ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isMetaMaskConnected ? (
                      <button
                        onClick={() => disconnectMetaMask()}
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-[#3B4046] bg-[#141618] text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMetaMask();
                        }}
                        type="button"
                        className="px-4 py-2 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 3: VaultX Secure Wallet */}
              <div className={cn(
                "rounded-2xl border p-4 transition-all duration-200",
                isVaultXConnected
                  ? "border-[#037DD6]/40 bg-[#037DD6]/10"
                  : "border-[#3B4046] bg-[#24272A]/70 hover:border-[#848C96]"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-[#037DD6]/15 border border-[#037DD6]/30 flex items-center justify-center text-[#037DD6]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">VaultX Secure Key Wallet</h3>
                        {isVaultXConnected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#037DD6]/20 px-2 py-0.5 text-[10px] font-medium text-[#037DD6]">
                            ● Protected
                          </span>
                        ) : hasExistingWallet ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            Locked
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[#848C96]">
                        Local AES-256 Key Encryption Key (KEK) engine in browser
                      </p>
                      {isVaultXConnected && identity && (
                        <div className="mt-2 flex items-center gap-2 font-mono text-xs text-[#037DD6] bg-[#141618] px-2.5 py-1 rounded-lg border border-[#3B4046] w-fit">
                          <span>{identity.id}</span>
                          <button onClick={handleCopyVxId} className="text-[#848C96] hover:text-[#F2F4F6]">
                            {copiedVxId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isVaultXConnected ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveView("security_details")}
                          type="button"
                          className="px-2.5 py-1.5 rounded-xl border border-[#3B4046] bg-[#141618] text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={disconnectWallet}
                          type="button"
                          className="px-2.5 py-1.5 rounded-xl border border-[#3B4046] bg-[#141618] text-xs font-medium text-[#848C96] hover:text-[#F2F4F6] transition-colors"
                        >
                          Lock
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveView("create")}
                        type="button"
                        className="px-4 py-2 rounded-xl border border-[#3B4046] bg-[#24272A] hover:bg-[#2B2F34] text-white text-xs font-semibold active:scale-[0.98] transition-all"
                      >
                        {hasExistingWallet ? "Unlock" : "Create"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Done / Continue button */}
            <div className="pt-2">
              <button
                onClick={onClose}
                type="button"
                className="w-full py-2.5 rounded-xl border border-[#3B4046] bg-[#24272A] text-sm font-medium text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: ONBOARDING / CREATE VAULTX WALLET ────────────────────────── */}
        {activeView === "create" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F6851B]/15 border border-[#F6851B]/30 flex items-center justify-center text-[#F6851B]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {hasExistingWallet ? "Unlock your VaultX Secure Wallet" : "Create your VaultX Secure Wallet"}
                </h2>
                <span className="text-xs text-[#848C96]">Zero-Knowledge Key Encryption Engine</span>
              </div>
            </div>

            <p className="text-sm text-[#848C96] leading-relaxed">
              VaultX Secure Wallet securely manages the cryptographic keys used to protect your files.
              Your encryption keys remain protected and are never uploaded as plaintext.
            </p>

            <div className="rounded-xl border border-[#037DD6]/30 bg-[#037DD6]/10 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#037DD6]">
                <Key className="h-3.5 w-3.5" />
                <span>Security Architecture Guarantees</span>
              </div>
              <ul className="text-xs text-[#848C96] space-y-1.5 list-disc pl-4">
                <li>Non-extractable 256-bit Key Encryption Key (KEK) generated locally in Web Crypto API.</li>
                <li>DEKs are wrapped in-browser before upload and unwrapped during local decryption.</li>
                <li>Zero exposure: Neither Pinata, IPFS nodes, nor servers ever receive your keys.</li>
              </ul>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/30 p-3 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setActiveView("choose")}
                type="button"
                className="flex-1 py-3 rounded-xl border border-[#3B4046] bg-[#24272A] text-sm font-medium text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateVaultX}
                disabled={isCreating}
                type="button"
                className="flex-1 py-3 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{hasExistingWallet ? "Unlock Secure Wallet" : "Create Secure Wallet"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: WALLET CREATION SUCCESS ─────────────────────────────────── */}
        {activeView === "created_success" && identity && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  VaultX Secure Wallet Created
                </h2>
                <p className="text-xs text-[#848C96]">Client-side cryptographic identity active</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#3B4046] bg-[#24272A] p-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#848C96]">
                  Encryption Identity
                </span>
                <div className="mt-1 flex items-center justify-between bg-[#141618] p-3 rounded-xl border border-[#037DD6]/40">
                  <span className="font-mono text-base font-bold text-[#037DD6] tracking-wide">
                    {identity.id}
                  </span>
                  <button
                    onClick={handleCopyVxId}
                    type="button"
                    className="p-1 rounded text-[#848C96] hover:text-[#F2F4F6]"
                  >
                    {copiedVxId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#848C96]">Status</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ● Protected
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#848C96]">Public Fingerprint</span>
                <span className="font-mono text-[#848C96]">{identity.fingerprint}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveView("security_details")}
                type="button"
                className="flex-1 py-2.5 rounded-xl border border-[#3B4046] bg-[#141618] text-xs font-semibold text-[#848C96] hover:text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
              >
                Security Details
              </button>
              <button
                onClick={onClose}
                type="button"
                className="flex-1 py-2.5 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white text-xs font-semibold shadow-md active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: SECURITY DETAILS ────────────────────────────────────────── */}
        {activeView === "security_details" && identity && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#F6851B]" />
                <span>VaultX Cryptographic Details</span>
              </h2>
              <button
                onClick={() => setActiveView("choose")}
                className="text-xs text-[#848C96] hover:text-[#F2F4F6] underline"
              >
                Back
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#848C96] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#141618] border border-[#3B4046] space-y-1">
                <span className="font-semibold text-white">Public Non-Sensitive ID:</span>
                <p className="font-mono text-[#037DD6]">{identity.id}</p>
                <p className="text-[11px] text-[#848C96]">Safe to display and share. Derived from SHA-256 identity entropy.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141618] border border-[#3B4046] space-y-1">
                <span className="font-semibold text-white">Master Key Encryption Key (KEK):</span>
                <p className="text-[11px]">Stored in browser IndexedDB as a non-exportable Web Crypto <code>CryptoKey</code> object.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141618] border border-[#3B4046] space-y-1">
                <span className="font-semibold text-white">Combined Dual-Wallet Security:</span>
                <p className="text-[11px]">
                  MetaMask verifies who you are on the blockchain (ownership, SIWE challenge).
                  VaultX Secure Wallet protects and unwraps the file encryption keys inside this browser.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveView("choose")}
              type="button"
              className="w-full py-2.5 rounded-xl border border-[#3B4046] bg-[#24272A] text-xs font-semibold text-[#F2F4F6] hover:bg-[#2B2F34] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
