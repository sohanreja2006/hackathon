import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * CYBER-10 Session Security Service
 * 
 * Manages tamper-proof, cryptographically signed HttpOnly session cookies.
 * 
 * Security Controls:
 * 1. HMAC-SHA256 signature verification in constant time to prevent timing attacks.
 * 2. Strict expiration timestamps (24-hour default).
 * 3. HttpOnly flags prevent client-side JavaScript access / XSS token exfiltration.
 * 4. Secure flags enforced in production.
 * 5. SameSite="lax" prevents CSRF cross-origin leakage.
 */

export interface SessionPayload {
  address: `0x${string}`;
  chainId: number;
  issuedAt: number;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = "cyber10_session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: AUTH_SESSION_SECRET environment variable is not set. " +
        "All sessions would use a publicly known fallback secret. " +
        "Set AUTH_SESSION_SECRET to a cryptographically random 32+ byte string."
      );
    }
    // Development fallback — acceptable only for local dev
    return "cyber10-dev-only-session-secret-NOT-FOR-PRODUCTION!!";
  }
  return secret;
}

/**
 * Encodes session payload with HMAC-SHA256 signature
 */
export function signSessionToken(payload: SessionPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson, "utf8").toString("base64url");

  const signature = createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies HMAC signature and expiration in constant time.
 * Returns decoded SessionPayload if valid, null otherwise.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadBase64, claimedSignature] = parts;

  // Recompute expected HMAC signature
  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");

  // Constant-time signature comparison to eliminate timing side-channel attacks
  const claimedBuf = Buffer.from(claimedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  if (claimedBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!timingSafeEqual(claimedBuf, expectedBuf)) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Validate payload shape
    if (!payload.address || !payload.expiresAt || typeof payload.expiresAt !== "number") {
      return null;
    }

    // Validate expiration
    if (Date.now() > payload.expiresAt) {
      return null; // Session expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to obtain the currently authenticated wallet from server contexts
 * (Route Handlers, Server Actions, Server Components).
 * 
 * Future phases (AES encryption key exchange, IPFS upload, metadata queries)
 * will call this function to ensure callers are genuinely authenticated.
 */
export async function getAuthenticatedWallet(): Promise<{
  address: `0x${string}`;
  chainId: number;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = verifySessionToken(sessionCookie.value);
    if (!session) {
      return null;
    }

    return {
      address: session.address,
      chainId: session.chainId,
    };
  } catch {
    return null;
  }
}
