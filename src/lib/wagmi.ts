import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia, arbitrum, polygon } from "wagmi/chains";

/**
 * CYBER-10 Wagmi & RainbowKit Configuration
 * 
 * Supports common EVM chains for decentralized identity and authentication.
 * Phase 1: Establishes wallet connection and provider sessions.
 * Phase 2: Will leverage this provider for EIP-4361 (SIWE) signature verification.
 */

// Fallback project ID for local development and hackathon evaluation
// Users can provide their own WalletConnect Cloud ID via .env.local
export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "21fef48091f12692cad574a6f7753643";

export const wagmiConfig = getDefaultConfig({
  appName: "CYBER-10 Secure Decentralized Storage",
  projectId: walletConnectProjectId,
  chains: [sepolia, mainnet, arbitrum, polygon],
  ssr: true,
});
