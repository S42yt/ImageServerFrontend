import { NextRequest, NextResponse } from "next/server";
import { getImageById, setImageOwner } from "@/lib/server-api";
import { cookies } from "next/headers";
import { getSession } from "@/lib/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const imageId = params.id;
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      console.error("API URL not configured");
      return new NextResponse("API URL not configured", { status: 500 });
    }

    const imageData = await getImageById(imageId);

    if (!imageData) {
      return new NextResponse("Image not found", { status: 404 });
    }

    try {
      const baseUrl =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "";
      const protocol = baseUrl.includes("localhost") ? "http" : "https";
      fetch(`${protocol}://${baseUrl}/api/image/${imageId}/view`, {
        method: "GET",
      }).catch((err) => {
        console.error("Failed to record view:", err);
      });
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }

    const imageResponse = await fetch(`${apiUrl}/cdn/${imageId}`);

    if (!imageResponse.ok) {
      return new NextResponse("Failed to fetch image", { status: 500 });
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const imageId = params.id;
    await request.json();

    let sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session_id");
      sessionId = sessionCookie?.value || null;
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "No session ID provided" },
        { status: 401 },
      );
    }

    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      console.log(
        `Session ${sessionId} not found in database, associating image anyway`,
      );
    }

    await setImageOwner(imageId, sessionId);
    console.log(`Assigned image ${imageId} to session ${sessionId}`);

    return NextResponse.json({ success: true, id: imageId, sessionId });
  } catch (error) {
    console.error("Error updating image metadata:", error);
    return NextResponse.json(
      { error: "Failed to update image metadata" },
      { status: 500 },
    );
  }
}
