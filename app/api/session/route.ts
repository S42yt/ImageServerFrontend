import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createOrUpdateSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieConsent = request.headers.get("X-Cookie-Consent");
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;

  if (cookieConsent === "declined") {
    if (sessionId) {
      const response = NextResponse.json({
        sessionId: null,
        cookieStatus: "declined",
      });
      response.cookies.delete("session_id");
      return response;
    }
    return NextResponse.json({ sessionId: null, cookieStatus: "declined" });
  }

  if (!sessionId) {
    sessionId = uuidv4();
  }

  try {
    await createOrUpdateSession(sessionId);
  } catch (error) {
    console.error("Failed to update session in database:", error);
  }

  const response = NextResponse.json({
    sessionId,
    cookieStatus: cookieConsent || "unknown",
  });

  if (cookieConsent === "accepted") {
    response.cookies.set({
      name: "session_id",
      value: sessionId,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
