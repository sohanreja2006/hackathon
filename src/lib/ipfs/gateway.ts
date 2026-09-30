/**
 * CYBER-10 Phase 4 — IPFS Gateway Helper (Client-Safe)
 *
 * This module is safe to import in browser-side components.
 * It only reads NEXT_PUBLIC_* env vars (never PINATA_JWT).
 *
 * Usage:
 *   import { getIpfsUrl } from "@/lib/ipfs/gateway";
 *   const url = getIpfsUrl("bafybeig...");
 */

/**
 * Default public IPFS gateway.
 * Can be overridden by setting NEXT_PUBLIC_IPFS_GATEWAY_URL in .env.local.
 */
const DEFAULT_GATEWAY = "https://gateway.pinata.cloud";

/**
 * Returns a fully qualified IPFS URL for a given CID via the configured gateway.
 *
 * Example:
 *   getIpfsUrl("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
 *   → "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
 */
export function getIpfsUrl(cid: string): string {
  const gateway =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL?.trim()) ||
    DEFAULT_GATEWAY;

  // Strip trailing slash from gateway if present
  const base = gateway.replace(/\/$/, "");
  return `${base}/ipfs/${cid}`;
}

/**
 * Returns the configured IPFS gateway base URL (no trailing slash).
 * Useful for displaying which gateway is in use.
 */
export function getGatewayBase(): string {
  const gateway =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL?.trim()) ||
    DEFAULT_GATEWAY;
  return gateway.replace(/\/$/, "");
}

/**
 * Basic CID format validation.
 * Accepts CIDv0 (Qm...) and CIDv1 (bafy...) formats.
 */
export function isValidCid(cid: string): boolean {
  if (!cid || typeof cid !== "string") return false;
  // CIDv0: base58 multihash starting with Qm (46 chars)
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) return true;
  // CIDv1: base32 multibase with bafy/bafk prefix (common Pinata format)
  if (/^[bB][a-zA-Z2-7]{58,}$/.test(cid)) return true;
  return false;
}

/**
 * Fetch encrypted bytes from IPFS via the configured gateway.
 * Returns the raw ArrayBuffer — decryption happens in the browser.
 */
export async function fetchFromIpfs(cid: string): Promise<ArrayBuffer> {
  if (!isValidCid(cid)) {
    throw new Error(`Invalid CID format: "${cid}"`);
  }

  const url = getIpfsUrl(cid);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      // No auth header — public gateway, encrypted data is safe to fetch publicly
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new Error(`Failed to reach IPFS gateway: ${msg}`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`CID not found on IPFS (404). The file may not be pinned yet.`);
    }
    throw new Error(
      `IPFS gateway returned ${response.status} ${response.statusText}.`
    );
  }

  return response.arrayBuffer();
}
