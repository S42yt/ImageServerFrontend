import { NextRequest, NextResponse } from "next/server";
import { getImageById, setImageOwner } from "@/lib/server-api";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const imageId = params.id;
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      console.error("API URL not configured");
      return new NextResponse("API URL not configured", { status: 500 });
    }

    // Get image data from server-side API
    const imageData = await getImageById(imageId);

    if (!imageData) {
      return new NextResponse("Image not found", { status: 404 });
    }

    try {
      // Record view asynchronously
      const baseUrl = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
      const protocol = baseUrl.includes("localhost") ? "http" : "https";
      fetch(`${protocol}://${baseUrl}/api/image/${imageId}/view`, { 
        method: "GET"  // Changed from POST to GET to match the route implementation
      }).catch((err) => {
        console.error("Failed to record view:", err);
      });
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }

    // Fetch image directly from backend without exposing the URL to the client
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
        // Add security headers to prevent referrer leakage
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
  { params }: { params: { id: string } },
) {
  try {
    const imageId = params.id;
    const data = await request.json();

    let sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      const cookieValue = cookies().get("session_id")?.value;
      sessionId = cookieValue || null;
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "No session ID provided" },
        { status: 401 },
      );
    }

    if (sessionId) {
      setImageOwner(imageId, sessionId);
      console.log(`Assigned image ${imageId} to session ${sessionId}`);
    }

    return NextResponse.json({ success: true, id: imageId, sessionId });
  } catch (error) {
    console.error("Error updating image metadata:", error);
    return NextResponse.json(
      { error: "Failed to update image metadata" },
      { status: 500 },
    );
  }
}
