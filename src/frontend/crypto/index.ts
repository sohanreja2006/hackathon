/**
 * SecureVault Frontend — Client Cryptography
 * 
 * Client-only hardware-accelerated WebCrypto primitives:
 * - AES-256-GCM encryption & decryption
 * - Key generation, raw hex export/import
 * - Browser-side bundle reconstruction & integrity checks
 */

export * from "@/lib/crypto";
export * as e2ee from "@/lib/e2ee";
export * from "@/lib/e2ee";
