import { NextRequest, NextResponse } from "next/server";
import { verifySiweSignature } from "@/lib/auth/siwe";
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";

/**
 * POST /api/auth/verify
 * 
 * Verifies the user's SIWE signature against the single-use nonce,
 * message domain, URI, and expiration.
 * On success, issues a secure HttpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required message or signature payload." },
        { status: 400 }
      );
    }

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
        {
          success: false,
          error: result.error || "Authentication verification failed.",
        },
        { status: 401 }
      );
    }

    // Build tamper-proof session payload
    const now = Date.now();
    const sessionPayload = {
      address: result.address,
      chainId: result.chainId || 1,
      issuedAt: now,
      expiresAt: now + SESSION_TTL_SECONDS * 1000,
    };

    const sessionToken = signSessionToken(sessionPayload);

    const response = NextResponse.json(
      {
        success: true,
        address: sessionPayload.address,
        chainId: sessionPayload.chainId,
        expiresAt: sessionPayload.expiresAt,
      },
      { status: 200 }
    );

    // Set secure HttpOnly cookie
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
