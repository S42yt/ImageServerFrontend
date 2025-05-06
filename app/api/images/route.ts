import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  }

  try {
    // Proxy the request to the backend server
    const response = await fetch(`${apiUrl}/images`, {
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }

    // Get the images from the API
    const images = await response.json();

    // Return the images with proxy URLs
    const baseUrl = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = baseUrl.includes("localhost") ? "http" : "https";
    
    const transformedImages = images.map((img: any) => {
      // Create a proxy URL for each image
      const proxyUrl = `${protocol}://${baseUrl}/api/image/${img.id}`;
      
      return {
        ...img,
        // Replace the URL with a proxy URL to prevent IP leakage
        url: proxyUrl,
      };
    });

    return NextResponse.json(transformedImages);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}