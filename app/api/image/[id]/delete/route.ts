import { NextRequest, NextResponse } from "next/server";
import { canDeleteImage } from "@/lib/server-api";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  }

  try {
    const imageId = params.id;
    
    // Get session ID from header or cookie
    let sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      const cookieValue = cookies().get("session_id")?.value;
      sessionId = cookieValue || null;
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "No session ID provided" },
        { status: 401 }
      );
    }

    // Verify that the user can delete this image
    if (!canDeleteImage(imageId, sessionId)) {
      return NextResponse.json(
        { error: "You don't have permission to delete this image" },
        { status: 403 }
      );
    }

    // Forward the delete request to the backend API
    const response = await fetch(`${apiUrl}/cdn/${imageId}`, {
      method: "DELETE",
      headers: {
        "X-Session-ID": sessionId
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete image: ${response.status} - ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}