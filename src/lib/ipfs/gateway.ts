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
 * List of resilient public IPFS gateways for automatic failover.
 */
const FALLBACK_GATEWAYS = [
  "https://gateway.pinata.cloud",
  "https://ipfs.io",
  "https://dweb.link",
  "https://cloudflare-ipfs.com",
];

/**
 * Fetch encrypted bytes from IPFS with automatic multi-gateway failover.
 * Returns the raw ArrayBuffer — decryption happens in the browser.
 */
export async function fetchFromIpfs(cid: string): Promise<ArrayBuffer> {
  if (!isValidCid(cid)) {
    throw new Error(`Invalid CID format: "${cid}"`);
  }

  const primaryGateway = getGatewayBase();
  // Build ordered list of unique gateways starting with the configured primary
  const gateways = Array.from(
    new Set([primaryGateway, ...FALLBACK_GATEWAYS])
  ).map((g) => g.replace(/\/+$/, ""));

  let lastError: Error | null = null;

  for (const gateway of gateways) {
    const url = `${gateway}/ipfs/${cid}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s per gateway

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.arrayBuffer();
      }
      lastError = new Error(`Gateway ${gateway} returned ${res.status} ${res.statusText}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      lastError = new Error(`Failed to fetch from ${gateway}: ${msg}`);
    }
  }

  throw lastError || new Error(`Could not fetch CID ${cid} from any IPFS gateway. It may still be propagating.`);
}
