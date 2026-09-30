"use client";

/**
 * useGoogleAuth hook
 *
 * Provides unified access to the Google / NextAuth session.
 * Complements the existing `useAuthStatus` hook (SIWE / MetaMask).
 *
 * Usage:
 *   const { googleUser, isGoogleAuthenticated, googleSignOut } = useGoogleAuth();
 */

import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback } from "react";

export interface GoogleUser {
  name: string | null;
  email: string | null;
  image: string | null;
  provider?: string;
}

export function useGoogleAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isGoogleAuthenticated = status === "authenticated" && Boolean(session?.user);

  const googleUser: GoogleUser | null = isGoogleAuthenticated
    ? {
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
        image: session?.user?.image ?? null,
        provider: (session?.user as Record<string, unknown>)?.provider as string | undefined,
      }
    : null;

  const googleSignIn = useCallback(async (callbackUrl = "/dashboard") => {
    await signIn("google", { callbackUrl });
  }, []);

  const googleSignOut = useCallback(async (redirectTo = "/") => {
    await signOut({ callbackUrl: redirectTo });
  }, []);

  return {
    googleUser,
    isGoogleAuthenticated,
    isGoogleLoading: isLoading,
    googleSignIn,
    googleSignOut,
  };
}
