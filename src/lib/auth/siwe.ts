import { parseSiweMessage } from "viem/siwe";
import { verifyMessage, isAddress } from "viem";
import { consumeAuthNonce } from "./nonce";

/**
 * CYBER-10 SIWE (EIP-4361) Verification Service
 * 
 * Verifies that a client-provided signature proves ownership of the claimed
 * EVM address without relying on trusted intermediaries.
 * 
 * Validation Pipeline:
 * 1. Parse standard EIP-4361 SIWE formatted message.
 * 2. Validate format, address syntax, and chain ID.
 * 3. Validate domain to prevent phishing / cross-site message reuse.
 * 4. Validate URI origin.
 * 5. Atomically validate and consume the single-use nonce to block replay attacks.
 * 6. Validate message timestamp (issued-at & optional expiration).
 * 7. Cryptographically recover the signer address from the ECDSA signature
 *    and ensure it matches parsed.address.
 */

export interface SiweVerificationParams {
  message: string;
  signature: `0x${string}`;
  expectedHost?: string;
  expectedOrigin?: string;
}

export interface SiweVerificationResult {
  success: boolean;
  address?: `0x${string}`;
  chainId?: number;
  error?: string;
}

export async function verifySiweSignature({
  message,
  signature,
  expectedHost,
  expectedOrigin,
}: SiweVerificationParams): Promise<SiweVerificationResult> {
  try {
    if (!message || typeof message !== "string") {
      return { success: false, error: "Missing or invalid SIWE message." };
    }

    if (!signature || typeof signature !== "string" || !signature.startsWith("0x")) {
      return { success: false, error: "Missing or malformed cryptographic signature." };
    }

    // 1. Parse SIWE message
    const parsed = parseSiweMessage(message);
    if (!parsed || !parsed.address || !parsed.nonce) {
      return { success: false, error: "Failed to parse SIWE message structure." };
    }

    // 2. Validate EVM address formatting
    if (!isAddress(parsed.address)) {
      return { success: false, error: "Invalid Ethereum address format in message." };
    }

    // 3. Validate Domain & Host to prevent cross-dApp signature reuse
    if (expectedHost && parsed.domain) {
      // Allow localhost with or without port (e.g. localhost:3000)
      const cleanHost = expectedHost.toLowerCase().split(":")[0];
      const messageHost = parsed.domain.toLowerCase().split(":")[0];
      if (cleanHost !== messageHost) {
        return {
          success: false,
          error: `Domain mismatch: message specifies '${parsed.domain}' but server expected '${expectedHost}'.`,
        };
      }
    }

    // 4. Validate URI
    if (expectedOrigin && parsed.uri) {
      const cleanExpected = expectedOrigin.toLowerCase().replace(/\/$/, "");
      const cleanUri = parsed.uri.toLowerCase().replace(/\/$/, "");
      if (!cleanUri.startsWith(cleanExpected) && !cleanExpected.startsWith(cleanUri)) {
        return {
          success: false,
          error: "URI origin mismatch in SIWE message.",
        };
      }
    }

    // 5. Validate Timestamps
    const now = new Date();
    if (parsed.expirationTime && now > parsed.expirationTime) {
      return { success: false, error: "Authentication message has expired." };
    }
    if (parsed.notBefore && now < parsed.notBefore) {
      return { success: false, error: "Authentication message is not yet active." };
    }

    // Allow up to 10 minutes forward clock drift for issuedAt
    const maxClockDriftMs = 10 * 60 * 1000;
    if (parsed.issuedAt && parsed.issuedAt.getTime() > now.getTime() + maxClockDriftMs) {
      return { success: false, error: "Message issued-at timestamp is in the future." };
    }

    // 6. Single-Use Nonce Validation & Atomic Consumption
    // CRITICAL: Must be consumed before signature check to prevent parallel replay races
    const nonceValid = consumeAuthNonce(parsed.nonce, parsed.address);
    if (!nonceValid) {
      return {
        success: false,
        error: "Authentication nonce is invalid, expired, or was already used. Please request a fresh challenge.",
      };
    }

    // 7. Cryptographic Signature Verification
    const isValidSignature = await verifyMessage({
      address: parsed.address,
      message,
      signature,
    });

    if (!isValidSignature) {
      return {
        success: false,
        error: "Cryptographic signature verification failed. The provided signature does not match the claimed wallet address.",
      };
    }

    // Authentication succeeded
    return {
      success: true,
      address: parsed.address,
      chainId: parsed.chainId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown verification error";
    return {
      success: false,
      error: `Verification error: ${message}`,
    };
  }
}
