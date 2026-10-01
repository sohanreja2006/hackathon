/**
 * SecureVault — E2EE Key Envelope Service
 *
 * Implements asymmetric key wrapping using:
 * - Ephemeral X25519 Key Agreement
 * - HKDF-SHA-256 Key Derivation
 * - AES-256-GCM Authenticated Encryption for the File Key
 *
 * ZERO-KNOWLEDGE INVARIANT:
 * - Plaintext AES file key is wrapped strictly on the sender device.
 * - The server stores only the encrypted envelope and public key metadata.
 * - The server can NEVER decrypt the key envelope.
 */

import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "./identity";

export interface KeyAgreementMetadata {
  ephemeralPublicKey: string; // X25519 public key hex
  iv: string;                 // 12-byte AES-GCM IV hex
  algorithm: "X25519-HKDF-SHA256-AES256GCM";
}

export interface EncryptedKeyEnvelope {
  encryptedFileKey: string;    // Wrapped AES-256 file key hex
  keyAgreementMetadata: KeyAgreementMetadata;
  recipientPublicKeyFingerprint: string;
}

export interface QuickShareEnvelope {
  encryptedFileKey: string;    // Wrapped AES-256 file key hex
  iv: string;                 // 12-byte IV hex
  algorithm: "AES256GCM-RANDOM-SECRET";
}

const HKDF_INFO = new TextEncoder().encode("SecureVault-E2EE-KeyWrapping-v1");
const HKDF_SALT = new Uint8Array(32); // Constant contextual salt

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Wraps an AES-256 File Key for a specific recipient using X25519 + HKDF-SHA-256 + AES-256-GCM.
 */
export async function createKeyEnvelope(
  fileKeyHex: string,
  recipientPublicKeyHex: string,
  recipientFingerprint: string
): Promise<EncryptedKeyEnvelope> {
  const recipientPubBytes = hexToBytes(recipientPublicKeyHex);
  const fileKeyBytes = hexToBytes(fileKeyHex);

  if (fileKeyBytes.length !== 32) {
    throw new Error(`Invalid AES key length: expected 32 bytes, got ${fileKeyBytes.length}`);
  }

  // 1. Generate ephemeral X25519 keypair
  const ephemeralPrivBytes = x25519.utils.randomPrivateKey();
  const ephemeralPubBytes = x25519.getPublicKey(ephemeralPrivBytes);

  // 2. Perform ECDH key agreement
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivBytes, recipientPubBytes);

  // 3. HKDF key derivation to derive 256-bit AES-GCM wrapping key
  const wrappingKeyBytes = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO, 32);

  // 4. Encrypt the file key using AES-256-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoWrappingKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(wrappingKeyBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    cryptoWrappingKey,
    toBufferSource(fileKeyBytes)
  );

  return {
    encryptedFileKey: bytesToHex(new Uint8Array(encryptedBuffer)),
    keyAgreementMetadata: {
      ephemeralPublicKey: bytesToHex(ephemeralPubBytes),
      iv: bytesToHex(iv),
      algorithm: "X25519-HKDF-SHA256-AES256GCM",
    },
    recipientPublicKeyFingerprint: recipientFingerprint,
  };
}

/**
 * Recipient unwraps the encrypted key envelope using their local private X25519 key.
 */
export async function unwrapKeyEnvelope(
  encryptedFileKeyHex: string,
  metadata: KeyAgreementMetadata | string,
  recipientPrivateKeyHex: string
): Promise<string> {
  const meta: KeyAgreementMetadata =
    typeof metadata === "string" ? JSON.parse(metadata) : metadata;
  const recipientPrivBytes = hexToBytes(recipientPrivateKeyHex);
  const ephemeralPubBytes = hexToBytes(meta.ephemeralPublicKey);
  const ivBytes = hexToBytes(meta.iv);
  const ciphertextBytes = hexToBytes(encryptedFileKeyHex);

  // 1. Recover shared secret
  const sharedSecret = x25519.getSharedSecret(recipientPrivBytes, ephemeralPubBytes);

  // 2. Derive 256-bit wrapping key
  const wrappingKeyBytes = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO, 32);

  // 3. Decrypt AES-GCM envelope
  const cryptoWrappingKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(wrappingKeyBytes),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(ivBytes) },
    cryptoWrappingKey,
    toBufferSource(ciphertextBytes)
  );

  return bytesToHex(new Uint8Array(decryptedBuffer));
}

/**
 * Creates a Quick Share envelope using a 256-bit cryptographically secure random secret.
 * The secret is placed ONLY in the URL hash fragment (#secret=...) and NEVER sent to the server.
 */
export async function createQuickShareEnvelope(
  fileKeyHex: string
): Promise<{ envelope: QuickShareEnvelope; secretHex: string }> {
  const fileKeyBytes = hexToBytes(fileKeyHex);
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secretHex = bytesToHex(secretBytes);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(secretBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    cryptoKey,
    toBufferSource(fileKeyBytes)
  );

  return {
    envelope: {
      encryptedFileKey: bytesToHex(new Uint8Array(encryptedBuffer)),
      iv: bytesToHex(iv),
      algorithm: "AES256GCM-RANDOM-SECRET",
    },
    secretHex,
  };
}

/**
 * Recipient unwraps a Quick Share envelope using the high-entropy secret extracted from URL hash.
 */
export async function unwrapQuickShareEnvelope(
  envelope: QuickShareEnvelope | string,
  secretHex: string
): Promise<string> {
  const env: QuickShareEnvelope =
    typeof envelope === "string" ? JSON.parse(envelope) : envelope;
  const secretBytes = hexToBytes(secretHex);
  const ivBytes = hexToBytes(env.iv);
  const ciphertextBytes = hexToBytes(env.encryptedFileKey);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(secretBytes),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(ivBytes) },
    cryptoKey,
    toBufferSource(ciphertextBytes)
  );

  return bytesToHex(new Uint8Array(decryptedBuffer));
}
