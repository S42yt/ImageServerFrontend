import axios from "axios";

// Client-side code uses proxied API routes instead of direct access to server
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5200"
).replace(/\/+$/, "");

export interface ImageItem {
  url: string;
  id: string;
  size: number;
  uploaded_at: string;
  views?: number;
  sessionId?: string;
}

const ensureCorrectUrl = (url: string) => {
  // For client-side rendering, always use proxied URLs
  if (typeof window !== "undefined") {
    const baseUrl = window.location.origin;
    if (url.includes("/cdn/")) {
      const idMatch = url.match(/\/cdn\/([^\/]+)/);
      if (idMatch && idMatch[1]) {
        return `${baseUrl}/api/image/${idMatch[1]}`;
      }
    }
  }

  // For server-side rendering, maintain original URL structure
  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  } else {
    return `${API_URL}/${url}`;
  }
};

// Ownership is tracked via the httpOnly session_id cookie (issued by
// middleware), sent automatically with credentials. The client never needs to
// know or pass the session id for these calls.
const registerOwnership = async (baseUrl: string, imageId: string) => {
  try {
    await fetch(`${baseUrl}/api/image/${imageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error registering image ownership:", error);
  }
};

export const api = {
  uploadImage: async (
    file: File,
    turnstileToken: string,
  ): Promise<ImageItem> => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("cf-turnstile-response", turnstileToken);

    const response = await axios.post(`${baseUrl}/api/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });

    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
      await registerOwnership(baseUrl, response.data.id);
    }

    return response.data;
  },

  uploadBase64Image: async (
    base64Data: string,
    turnstileToken: string,
  ): Promise<ImageItem> => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const response = await axios.post(
      `${baseUrl}/api/upload`,
      {
        base64: base64Data,
        "cf-turnstile-response": turnstileToken,
      },
      { withCredentials: true },
    );

    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
      await registerOwnership(baseUrl, response.data.id);
    }

    return response.data;
  },

  getAllImages: async (): Promise<ImageItem[]> => {
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";

      const response = await axios.get(`${baseUrl}/api/images`, {
        withCredentials: true,
      });
      const images = Array.isArray(response.data) ? response.data : [];

      return images.map((img) => ({
        ...img,
        url: ensureCorrectUrl(img.url),
      }));
    } catch (error) {
      console.error("Failed to fetch images:", error);
      return [];
    }
  },

  deleteImage: async (imageId: string): Promise<void> => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    await axios.delete(`${baseUrl}/api/image/${imageId}/delete`, {
      withCredentials: true,
    });
  },

  getProxiedImageUrl: (imageId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/image/${encodeURIComponent(imageId)}`;
  },

  getEmbededLink: (imageId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/image/${encodeURIComponent(imageId)}`;
  },

  getImageLink: (imageId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/image/${encodeURIComponent(imageId)}`;
  },

  recordImageView: async (
    imageId: string,
  ): Promise<{ count: number; success: boolean }> => {
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetch(`${baseUrl}/api/image/${imageId}/view`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();
      return {
        count: data.count || data.newCount || 0,
        success: data.success || false,
      };
    } catch (error) {
      console.error("Failed to record image view:", error);
      return { count: 0, success: false };
    }
  },

  sortImagesByViewCount: (images: ImageItem[]): ImageItem[] => {
    return [...images].sort((a, b) => (b.views || 0) - (a.views || 0));
  },

  sortImagesByNewest: (images: ImageItem[]): ImageItem[] => {
    return [...images].sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
  },

  sortImagesByOldest: (images: ImageItem[]): ImageItem[] => {
    return [...images].sort(
      (a, b) =>
        new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime(),
    );
  },

  areCookiesAccepted: (): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cookie-consent") === "accepted";
  },
};
