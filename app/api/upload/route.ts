import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/+$/, "");

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 },
    );
  }

  try {
    // Once a session has passed Turnstile, it stays verified: the verified
    // cookie carries the session id it was issued for. A new session id (cookie
    // cleared) won't match, so a fresh challenge is required.
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value || "";
    const verifiedFor = cookieStore.get("turnstile_verified")?.value || "";
    const alreadyVerified = !!sessionId && verifiedFor === sessionId;

    // Handle both formData and JSON uploads
    let body;
    const headers: Record<string, string> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
      // No need to set Content-Type header, it will be set automatically with boundary
    } else {
      body = await request.json();
      headers["Content-Type"] = "application/json";
    }

    // Verified session skips the challenge on the backend via the shared secret.
    if (alreadyVerified && process.env.INTERNAL_API_SECRET) {
      headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
    }

    // Forward the request to the backend API
    const response = await fetch(`${apiUrl}/upload`, {
      method: "POST",
      headers,
      body: contentType.includes("multipart/form-data")
        ? body
        : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload image: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();

    // Make sure the response contains URL and replace it with a proxy URL
    if (data && data.url) {
      const baseUrl =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "";
      const protocol = request.headers.get("x-forwarded-proto") || (baseUrl.includes("localhost") ? "http" : "https");

      const proxyUrl = `${protocol}://${baseUrl}/api/image/${data.id}`;
      data.url = proxyUrl;
    }

    const res = NextResponse.json(data);

    // First successful upload (Turnstile just passed) marks this session
    // verified so later uploads skip the challenge.
    if (!alreadyVerified && sessionId) {
      res.cookies.set({
        name: "turnstile_verified",
        value: sessionId,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return res;
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
