import axios from "axios";

// Get the API URL from environment variables with fallback for client environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5200";

export interface ImageItem {
  url: string;
  id: string;
  size: number;
  uploaded_at: string;
  views?: number;
  sessionId?: string;
}

const ensureCorrectUrl = (url: string) => {
  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  } else {
    return `${API_URL}/${url}`;
  }
};

export const api = {
  // Get or create a session for the current user
  getSession: async (): Promise<string> => {
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const cookieConsent = localStorage.getItem("cookie-consent");

      const response = await fetch(`${baseUrl}/api/session`, {
        headers: {
          "X-Cookie-Consent": cookieConsent || "unknown",
        },
      });

      const data = await response.json();
      return data.sessionId || "";
    } catch (error) {
      console.error("Failed to get session:", error);
      return "";
    }
  },

  uploadImage: async (
    file: File,
    turnstileToken: string,
  ): Promise<ImageItem> => {
    // Get session ID before uploading
    const sessionId = await api.getSession();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("cf-turnstile-response", turnstileToken);
    formData.append("sessionId", sessionId); // Include session ID with upload

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true, // Send cookies
    });

    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
      // Store the session ID with the image data
      response.data.sessionId = sessionId;

      // Register the image ownership in our system
      try {
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        await fetch(`${baseUrl}/api/image/${response.data.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId,
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error("Error registering image ownership:", error);
      }
    }

    return response.data;
  },

  uploadBase64Image: async (
    base64Data: string,
    turnstileToken: string,
  ): Promise<ImageItem> => {
    // Get session ID before uploading
    const sessionId = await api.getSession();

    const response = await axios.post(`${API_URL}/upload`, {
      base64: base64Data,
      "cf-turnstile-response": turnstileToken,
      sessionId, // Include session ID with upload
    });

    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
      // Store the session ID with the image data
      response.data.sessionId = sessionId;

      // Register the image ownership in our system
      try {
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        await fetch(`${baseUrl}/api/image/${response.data.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId,
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error("Error registering image ownership:", error);
      }
    }

    return response.data;
  },

  getAllImages: async (): Promise<ImageItem[]> => {
    try {
      const sessionId = await api.getSession();
      const response = await axios.get(`${API_URL}/images`);

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
    try {
      const sessionId = await api.getSession();
      const canDelete = await api.canDeleteImage(imageId, sessionId);

      if (!canDelete) {
        throw new Error("You don't have permission to delete this image");
      }

      await axios.delete(`${API_URL}/cdn/${imageId}`, {
        withCredentials: true,
        headers: {
          "X-Session-ID": sessionId,
        },
      });
    } catch (error) {
      console.error("Failed to delete image:", error);
      throw error;
    }
  },

  canDeleteImage: async (
    imageId: string,
    sessionId: string,
  ): Promise<boolean> => {
    try {
      const images = await api.getAllImages();
      const image = images.find((img) => img.id === imageId);

      return image?.sessionId === sessionId;
    } catch (error) {
      console.error("Failed to check delete permission:", error);
      return false;
    }
  },

  getProxiedImageUrl: (imageId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/image/${encodeURIComponent(imageId)}`;
  },

  getShareableLink: (imageId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/image/${encodeURIComponent(imageId)}`;
  },

  recordImageView: async (
    imageId: string,
  ): Promise<{ count: number; success: boolean }> => {
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetch(`${baseUrl}/api/image/${imageId}/view`, {
        method: "POST",
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

  // Check if cookies are accepted
  areCookiesAccepted: (): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cookie-consent") === "accepted";
  },
};
