import axios from 'axios';

// Get the API URL from environment variables with fallback for client environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5200';

export interface ImageItem {
  url: string;
  id: string;
  size: number;
  uploaded_at: string;
}

const ensureCorrectUrl = (url: string) => {
  if (url.startsWith('http')) {
    return url; 
  }
  
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  } else {
    return `${API_URL}/${url}`;
  }
};

// Client-side API methods
export const api = {
  uploadImage: async (file: File, turnstileToken: string): Promise<ImageItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cf-turnstile-response', turnstileToken);
    
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
    }
    
    return response.data;
  },
  
  uploadBase64Image: async (base64Data: string, turnstileToken: string): Promise<ImageItem> => {
    const response = await axios.post(`${API_URL}/upload`, {
      base64: base64Data,
      'cf-turnstile-response': turnstileToken
    });
    
    if (response.data && response.data.url) {
      response.data.url = ensureCorrectUrl(response.data.url);
    }
    
    return response.data;
  },
  
  getAllImages: async (): Promise<ImageItem[]> => {
    try {
      const response = await axios.get(`${API_URL}/images`);
      
      const images = Array.isArray(response.data) ? response.data : [];
      
      return images.map(img => ({
        ...img,
        url: ensureCorrectUrl(img.url)
      }));
    } catch (error) {
      console.error('Failed to fetch images:', error);
      return [];
    }
  },
  
  deleteImage: async (imageId: string): Promise<void> => {
    try {
      await axios.delete(`${API_URL}/cdn/${imageId}`);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw error; 
    }
  },
  
  // Method for sharing image URL
  getShareableLink: (imageId: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/?id=${encodeURIComponent(imageId)}`;
  }
}