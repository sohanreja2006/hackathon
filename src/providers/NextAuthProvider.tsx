"use client";

/**
 * NextAuth SessionProvider wrapper.
 * This is a client component because SessionProvider uses React context.
 * Used to wrap the app so `useSession()` / `getSession()` work anywhere.
 */

import { SessionProvider } from "next-auth/react";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
