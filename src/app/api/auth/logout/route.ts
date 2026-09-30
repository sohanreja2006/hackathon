import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 * 
 * Clears the HttpOnly session cookie on the server.
 */
export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Authentication session invalidated successfully." },
    { status: 200 }
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
