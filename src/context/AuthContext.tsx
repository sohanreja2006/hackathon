"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";

export type AuthStage =
  | "idle"
  | "requesting_nonce"
  | "awaiting_signature"
  | "verifying"
  | "authenticated"
  | "error";

interface AuthContextType {
  isAuthenticated: boolean;
  sessionAddress: `0x${string}` | undefined;
  authStage: AuthStage;
  authError: string | null;
  isCheckingSession: boolean;
  signInWithWallet: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  sessionAddress: undefined,
  authStage: "idle",
  authError: null,
  isCheckingSession: true,
  signInWithWallet: async () => false,
  logout: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [sessionAddress, setSessionAddress] = useState<`0x${string}` | undefined>(undefined);
  const [authStage, setAuthStage] = useState<AuthStage>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const clearError = useCallback(() => {
    setAuthError(null);
    if (authStage === "error") {
      setAuthStage("idle");
    }
  }, [authStage]);

  /**
   * Asynchronous session initialization on mount & wallet update
   */
  useEffect(() => {
    let isSubscribed = true;

    async function loadServerSession() {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
        });

        if (!isSubscribed) return;

        if (!res.ok) {
          setSessionAddress(undefined);
          return;
        }

        const data = await res.json();
        if (!isSubscribed) return;

        if (data.authenticated && data.address) {
          const verifiedAddr = data.address as `0x${string}`;
          // If address is connected, ensure session belongs to this exact wallet
          if (address && verifiedAddr.toLowerCase() !== address.toLowerCase()) {
            setSessionAddress(undefined);
          } else {
            setSessionAddress(verifiedAddr);
          }
        } else {
          setSessionAddress(undefined);
        }
      } catch {
        if (isSubscribed) {
          setSessionAddress(undefined);
        }
      } finally {
        if (isSubscribed) {
          setIsCheckingSession(false);
        }
      }
    }

    loadServerSession();

    return () => {
      isSubscribed = false;
    };
  }, [address]);

  /**
   * Auto-initialize & register dedicated E2EE asymmetric encryption identity
   * whenever a wallet connects (private key stays on device, public key registered).
   */
  useEffect(() => {
    if (address) {
      import("@/lib/e2ee").then(({ getOrCreateLocalIdentity }) => {
        getOrCreateLocalIdentity(address).then((id) => {
          import("@/lib/payloadClient").then(({ registerEncryptionIdentityApi }) => {
            registerEncryptionIdentityApi(id.publicKeyHex, id.fingerprint, address);
          });
        });
      }).catch((err) => {
        console.warn("Could not initialize E2EE identity:", err);
      });
    }
  }, [address]);

  /**
   * Cryptographic Sign-In With Ethereum (SIWE) Flow
   */
  const signInWithWallet = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !address) {
      setAuthError("No wallet connected. Please connect your EVM wallet first.");
      setAuthStage("error");
      return false;
    }

    try {
      setAuthError(null);

      // STEP 1: Request cryptographically random single-use nonce from server
      setAuthStage("requesting_nonce");
      const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });

      if (!nonceRes.ok) {
        throw new Error("Failed to obtain authentication challenge from server.");
      }

      const nonceData = await nonceRes.json();
      if (!nonceData.nonce) {
        throw new Error("Server returned empty challenge nonce.");
      }

      // STEP 2: Construct standard EIP-4361 SIWE message
      const domain = window.location.host;
      const uri = window.location.origin;
      const chainId = chain?.id || 1;

      const message = createSiweMessage({
        domain,
        address: address as `0x${string}`,
        statement:
          "Sign in to CYBER-10 to access your decentralized secure file vault. Zero server custody.",
        uri,
        version: "1",
        chainId,
        nonce: nonceData.nonce,
        issuedAt: new Date(),
      });

      // STEP 3: Prompt wallet for cryptographic signature
      setAuthStage("awaiting_signature");
      let signature: `0x${string}`;

      try {
        signature = await signMessageAsync({ message });
      } catch (signErr: unknown) {
        const errorMsg =
          signErr instanceof Error
            ? signErr.message
            : "User rejected cryptographic signature.";

        if (
          errorMsg.toLowerCase().includes("user rejected") ||
          errorMsg.toLowerCase().includes("rejected") ||
          errorMsg.toLowerCase().includes("denied")
        ) {
          throw new Error("Signature rejected in wallet. Authentication aborted.");
        }
        throw new Error(`Wallet signing failed: ${errorMsg}`);
      }

      // STEP 4: Submit signed message to server for verification
      setAuthStage("verifying");
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Cryptographic signature verification failed.");
      }

      // STEP 5: Successful verification, establish authenticated session state
      const verifiedAddr = (verifyData.address || address) as `0x${string}`;
      setSessionAddress(verifiedAddr);
      setAuthStage("authenticated");
      setAuthError(null);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      setAuthError(msg);
      setAuthStage("error");
      return false;
    }
  }, [address, isConnected, chain, signMessageAsync]);

  /**
   * Log out and destroy server-side HttpOnly session cookie
   */
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Best effort network call
    } finally {
      setSessionAddress(undefined);
      setAuthStage("idle");
      setAuthError(null);
    }
  }, []);

  /**
   * Derived Authentication State:
   * Requires:
   * 1. EVM wallet is currently connected.
   * 2. Connected wallet address matches the verified server session address.
   * If user switches account from 0xAAA to 0xBBB, this immediately evaluates to false!
   */
  const isAuthenticated = Boolean(
    isConnected &&
    address &&
    sessionAddress &&
    address.toLowerCase() === sessionAddress.toLowerCase()
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        sessionAddress,
        authStage: isAuthenticated ? "authenticated" : authStage === "authenticated" ? "idle" : authStage,
        authError,
        isCheckingSession,
        signInWithWallet,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthContext);
}
