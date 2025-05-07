import { NextRequest, NextResponse } from "next/server";
import { canDeleteImage } from "@/lib/server-api";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
        { canDelete: false, error: "No session ID provided" },
        { status: 200 }
      );
    }

    const hasPermission = await canDeleteImage(imageId, sessionId);
    
    return NextResponse.json({ 
      canDelete: hasPermission,
      sessionId: sessionId,
      imageId: imageId
    });
  } catch (error) {
    console.error("Error checking delete permission:", error);
    return NextResponse.json(
      { canDelete: false, error: "Failed to check permission" },
      { status: 200 }
    );
  }
}