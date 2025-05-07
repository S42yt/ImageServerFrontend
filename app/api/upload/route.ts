import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error("API URL not configured");
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 },
    );
  }

  try {
    // Handle both formData and JSON uploads
    let body;
    let headers = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle form data upload
      body = await request.formData();
      // No need to set Content-Type header, it will be set automatically with boundary
    } else {
      // Handle JSON upload (base64)
      body = await request.json();
      headers = {
        "Content-Type": "application/json",
      };
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
      const protocol = baseUrl.includes("localhost") ? "http" : "https";

      // Create a proxy URL for the image
      const proxyUrl = `${protocol}://${baseUrl}/api/image/${data.id}`;
      data.url = proxyUrl;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
