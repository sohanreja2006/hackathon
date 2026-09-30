/**
 * SecureVault — End-to-End Encryption (E2EE) Module
 *
 * Implements:
 * - Dedicated X25519 asymmetric identity keypairs
 * - Human-readable security verification fingerprints (e.g. 7A91 42D8 C31F 8E72 91AB 4D20)
 * - Ephemeral X25519 + HKDF-SHA-256 + AES-256-GCM key wrapping
 * - Quick Share high-entropy secret envelopes
 */

export * from "./identity";
export * from "./envelope";
