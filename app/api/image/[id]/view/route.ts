import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { incrementViewCount } from "@/lib/server-api";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const imageId = params.id;

    const ip =
      request.headers.get("x-forwarded-for") || ipAddress(request) || "unknown";

    const result = await incrementViewCount(imageId, ip);

    return NextResponse.json({
      success: true,
      counted: result.counted,
      count: result.count,
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
