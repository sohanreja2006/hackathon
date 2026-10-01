import { NextRequest, NextResponse } from "next/server";
import { isValidCid } from "@/lib/ipfs/gateway";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/files/download?cid=<cid>
 *
 * Secure server-side IPFS download proxy.
 *
 * Why this is needed:
 * - Public IPFS gateways (like Cloudflare, Pinata, or IPFS.io) often enforce strict
 *   CORS, rate limiting, or Cloudflare challenge pages that block browser-origin fetch() calls.
 * - By proxying through this Next.js server route, we eliminate all browser CORS errors.
 * - The server can optionally authenticate to Pinata with PINATA_JWT to use dedicated bandwidth.
 * - The server ONLY receives and proxies CIPHERTEXT (.cyber10enc).
 * - Zero plaintext leaves the client, and zero plaintext touches the server.
 *
 * SECURITY: Rate-limited by client IP to prevent bandwidth exhaustion abuse.
 */
export async function GET(req: NextRequest) {
  // Rate limit per client IP
  const ip = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`ipfs_download:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error || "Too many download requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const cid = searchParams.get("cid")?.trim();

  if (!cid || !isValidCid(cid)) {
    return NextResponse.json(
      { error: "Invalid or missing CID query parameter." },
      { status: 400 }
    );
  }

  const pinataJwt = process.env.PINATA_JWT?.trim();

  // Gateways to query in sequence
  const gateways = [
    "https://gateway.pinata.cloud",
    "https://ipfs.io",
    "https://dweb.link",
  ];

  let lastError: string = "Unknown error";

  for (const gateway of gateways) {
    const url = `${gateway}/ipfs/${cid}`;
    try {
      const headers: Record<string, string> = {};
      if (gateway.includes("pinata.cloud") && pinataJwt) {
        headers["Authorization"] = `Bearer ${pinataJwt}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-IPFS-CID": cid,
          },
        });
      }

      lastError = `Gateway ${gateway} returned ${res.status} ${res.statusText}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      lastError = `Failed to connect to ${gateway}: ${msg}`;
    }
  }

  return NextResponse.json(
    { error: `Could not retrieve IPFS payload: ${lastError}` },
    { status: 502 }
  );
}
