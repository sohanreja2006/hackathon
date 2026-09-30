"use client";

import React, { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { AuthProvider } from "@/context/AuthContext";
import { VaultXWalletProvider } from "@/context/VaultXWalletContext";
import "@rainbow-me/rainbowkit/styles.css";

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // Maintain a stable query client instance across client re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={lightTheme({
            accentColor: "#2563EB",           // SecureVault Royal Blue
            accentColorForeground: "#ffffff", // Pure White
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <AuthProvider>
            <VaultXWalletProvider>{children}</VaultXWalletProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
