import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const apiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/+$/, "");

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${apiUrl}/images`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }

    const images = await response.json();

    const baseUrl =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const protocol = request.headers.get("x-forwarded-proto") || (baseUrl.includes("localhost") ? "http" : "https");

    const transformedImages = images.map((img: { id: string; [key: string]: unknown }) => {
      const proxyUrl = `${protocol}://${baseUrl}/api/image/${img.id}`;

      return {
        ...img,
        url: proxyUrl,
      };
    });

    return NextResponse.json(transformedImages);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 },
    );
  }
}
