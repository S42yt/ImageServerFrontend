import { NextRequest, NextResponse } from "next/server";

// Ensure every visitor has a stable session_id cookie BEFORE any page renders.
// This is the single source of session identity (functional cookie for image
// ownership), so server components can read it on the same request — no client
// round-trip, no race, no ownership flicker.
export function middleware(request: NextRequest) {
  if (request.cookies.has("session_id")) {
    return NextResponse.next();
  }

  const sessionId = crypto.randomUUID();

  // Make the cookie visible to THIS request's server components too.
  request.cookies.set("session_id", sessionId);
  const response = NextResponse.next({ request: { headers: request.headers } });

  response.cookies.set({
    name: "session_id",
    value: sessionId,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  // Run on pages and API routes; skip static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
