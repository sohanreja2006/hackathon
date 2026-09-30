"use client";

import { useSyncExternalStore } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAuthSession } from "@/context/AuthContext";

const emptySubscribe = () => () => {};

/**
 * useAuthStatus Hook (Phase 2 Enhanced)
 * 
 * Provides unified access to:
 * 1. EVM wallet connection status (Wagmi).
 * 2. Cryptographic SIWE authentication state & HttpOnly session status.
 * 
 * Guarantees:
 * - isAuthenticated is ONLY true when the user has cryptographically signed
 *   a fresh, single-use server nonce with their connected wallet and obtained
 *   a valid HttpOnly session cookie.
 * - Changing the active wallet account in MetaMask / Rainbow automatically
 *   invalidates the session view and requires re-authentication.
 */
export function useAuthStatus() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { address, isConnected, isConnecting, isReconnecting, chain, connector } = useAccount();
  const { disconnect } = useDisconnect();

  const {
    isAuthenticated,
    sessionAddress,
    authStage,
    authError,
    isCheckingSession,
    signInWithWallet,
    logout,
    clearError,
  } = useAuthSession();

  return {
    isMounted,
    address: isMounted ? address : undefined,
    isConnected: isMounted ? isConnected : false,
    isConnecting: isMounted ? (isConnecting || isReconnecting) : true,
    chainId: isMounted ? chain?.id : undefined,
    chainName: isMounted ? chain?.name : undefined,
    connectorName: isMounted ? connector?.name : undefined,
    disconnect,

    // Phase 2 Cryptographic SIWE Session fields:
    isAuthenticated: isMounted ? isAuthenticated : false,
    sessionAddress: isMounted ? sessionAddress : undefined,
    authStage: isMounted ? authStage : "idle",
    authError: isMounted ? authError : null,
    isCheckingSession: isMounted ? isCheckingSession : true,
    signInWithWallet,
    logout,
    clearError,
  };
}
