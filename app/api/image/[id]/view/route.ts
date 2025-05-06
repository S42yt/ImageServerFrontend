import { NextRequest, NextResponse } from "next/server";
import { incrementViewCount } from "@/lib/server-api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const imageId = params.id;

    const ip =
      request.headers.get("x-forwarded-for") || request.ip || "unknown";

    const result = await incrementViewCount(imageId, ip);

    return NextResponse.json({
      success: true,
      counted: result.counted,
      views: result.count,
    });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to increment view count",
      },
      { status: 500 },
    );
  }
}
