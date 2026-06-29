import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createOrUpdateSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    sessionId = uuidv4();
  }

  try {
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.nextUrl.hostname ||
      "unknown";
    await createOrUpdateSession(sessionId, ipAddress);
  } catch (error) {
    console.error("Failed to update session in database:", error);
  }

  const response = NextResponse.json({ sessionId });

  // session_id is a functional cookie (image ownership / delete rights), so it
  // is always set regardless of the marketing-cookie consent banner.
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
