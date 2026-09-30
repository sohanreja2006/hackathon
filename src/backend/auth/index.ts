/**
 * SecureVault Backend — Authentication Service
 * 
 * Server-only cryptographic validation routines for:
 * - SIWE (EIP-4361) signature verification
 * - Replay-protected single-use nonce generation & consumption
 * - Stateless and cookie-based Web3 session token management
 */

export * from "@/lib/auth/siwe";
export * from "@/lib/auth/session";
export * from "@/lib/auth/nonce";
