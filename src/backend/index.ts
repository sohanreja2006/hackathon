/**
 * SecureVault Backend Root
 * 
 * Central access point for all server-side services:
 * - Auth (SIWE, sessions, nonces)
 * - IPFS (Pinata pinning)
 * - Payload CMS (file metadata, chunking, share management)
 */

export * as auth from "./auth";
export * as ipfs from "./ipfs";
export * as payload from "./payload";

export { verifySiweSignature, signSessionToken, verifySessionToken, generateAuthNonce, consumeAuthNonce } from "./auth";
export { uploadEncryptedFileToPinata, PINATA_UPLOAD_URL, MAX_ENCRYPTED_SIZE_BYTES } from "./ipfs";
export { payloadService, payloadStore, getPayloadAuth } from "./payload";
