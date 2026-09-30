import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

/**
 * GET /api/auth/session
 * 
 * Checks whether an active, valid HttpOnly session cookie exists.
 * Returns the authenticated wallet address and session validity.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const session = verifySessionToken(sessionCookie.value);

    if (!session) {
      // Token is either invalid, tampered, or expired
      const response = NextResponse.json(
        { authenticated: false, error: "Session invalid or expired" },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
      // Clear invalid cookie
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        address: session.address,
        chainId: session.chainId,
        expiresAt: session.expiresAt,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Error checking session state" },
      { status: 500 }
    );
  }
}
