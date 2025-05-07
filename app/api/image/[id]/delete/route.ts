import { NextRequest, NextResponse } from "next/server";
import { canDeleteImage, deleteAllImageData } from "@/lib/server-api";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 },
    );
  }

  try {
    const imageId = params.id;

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

    const hasPermission = await canDeleteImage(imageId, sessionId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to delete this image" },
        { status: 403 },
      );
    }

    // Delete the image on the CDN server first
    const response = await fetch(`${apiUrl}/cdn/${imageId}`, {
      method: "DELETE",
      headers: {
        "X-Session-ID": sessionId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete image: ${response.status} - ${errorText}`,
      );
    }

    await deleteAllImageData(imageId);
    console.log(`All data for image ${imageId} deleted from database`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
