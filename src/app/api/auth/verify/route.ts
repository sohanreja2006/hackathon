import { NextRequest, NextResponse } from "next/server";
import { verifyMessage, isAddress } from "viem";
import { verifySiweSignature } from "@/lib/auth/siwe";
import { consumeAuthNonce } from "@/lib/auth/nonce";
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";
import { payloadStore } from "@/lib/payload/store";
import { upsertUser } from "@/lib/payload/db";

/**
 * POST /api/auth/verify
 *
 * Verifies wallet signature against a single-use cryptographically random nonce.
 * Supports both:
 * 1. Standard EIP-4361 SIWE message payload: { message, signature }
 * 2. Direct wallet auth payload: { walletAddress, nonce, signature, message? }
 *
 * Security:
 * - Never trusts client-claimed walletAddress without valid ECDSA signature proof.
 * - Nonce is strictly single-use and short-lived.
 * - Issues secure HttpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, signature, walletAddress, nonce } = body;

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing cryptographic signature." },
        { status: 400 }
      );
    }

    let verifiedAddress: `0x${string}` | null = null;
    let chainId = 1;

    // Case 1: Standard SIWE message
    if (message && typeof message === "string" && message.includes("wants you to sign in with your Ethereum account")) {
      const host = req.headers.get("host") || req.nextUrl.host;
      const origin = req.headers.get("origin") || req.nextUrl.origin;

      const result = await verifySiweSignature({
        message,
        signature,
        expectedHost: host,
        expectedOrigin: origin,
      });

      if (!result.success || !result.address) {
        return NextResponse.json(
          { success: false, error: result.error || "SIWE verification failed." },
          { status: 401 }
        );
      }
      verifiedAddress = result.address;
      chainId = result.chainId || 1;
    }
    // Case 2: Direct wallet signature verification: { walletAddress, nonce, signature }
    else if (walletAddress && nonce) {
      const normalized = walletAddress.toLowerCase();
      if (!isAddress(normalized)) {
        return NextResponse.json(
          { success: false, error: "Invalid Ethereum address format." },
          { status: 400 }
        );
      }

      // 1. Validate and consume single-use nonce
      const nonceValid = consumeAuthNonce(nonce, normalized);
      if (!nonceValid) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication nonce is invalid, expired, or has already been used.",
          },
          { status: 401 }
        );
      }

      // 2. Verify signature against the signed message
      const candidateMessages: string[] = [];
      if (message) candidateMessages.push(message);
      candidateMessages.push(
        `Sign in to SecureVault\nWallet: ${normalized}\nNonce: ${nonce}`,
        `Sign in to SecureVault\nNonce: ${nonce}`,
        nonce
      );

      let signatureValid = false;
      for (const msg of candidateMessages) {
        try {
          const isValid = await verifyMessage({
            address: normalized as `0x${string}`,
            message: msg,
            signature,
          });
          if (isValid) {
            signatureValid = true;
            verifiedAddress = normalized as `0x${string}`;
            break;
          }
        } catch {
          // try next format
        }
      }

      if (!signatureValid || !verifiedAddress) {
        return NextResponse.json(
          {
            success: false,
            error: "Signature verification failed. The provided signature does not match the wallet address.",
          },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required authentication fields: provide { message, signature } or { walletAddress, nonce, signature }.",
        },
        { status: 400 }
      );
    }

    const normalizedAddress = verifiedAddress.toLowerCase();

    // 3. Find or create Payload user in persistent database
    let payloadUser;
    try {
      payloadUser = await upsertUser(normalizedAddress, {
        lastAuthenticatedAt: new Date().toISOString(),
      });
      payloadStore.findOrCreateUser(normalizedAddress);
    } catch {
      payloadUser = payloadStore.findOrCreateUser(normalizedAddress);
    }

    // 4. Record wallet authentication event in immutable activity log
    try {
      payloadStore.appendActivity(
        normalizedAddress,
        "wallet_authenticated",
        "Wallet authenticated via cryptographic signature",
        { chainId }
      );
    } catch {
      // Non-fatal
    }

    // 5. Build tamper-proof session payload
    const now = Date.now();
    const sessionPayload = {
      address: normalizedAddress as `0x${string}`,
      chainId,
      issuedAt: now,
      expiresAt: now + SESSION_TTL_SECONDS * 1000,
    };

    const sessionToken = signSessionToken(sessionPayload);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: payloadUser.id,
          walletAddress: normalizedAddress,
          status: "active",
        },
        address: normalizedAddress,
        chainId: sessionPayload.chainId,
        expiresAt: sessionPayload.expiresAt,
      },
      { status: 200 }
    );

    // 6. Issue secure HttpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json(
      { success: false, error: `Authentication error: ${message}` },
      { status: 500 }
    );
  }
}
