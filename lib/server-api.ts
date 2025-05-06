// Server-side only API functions
// This file should only be imported in Server Components

// Get the API URL from environment variables with fallback
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5200';

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

// Server-side data fetching with revalidation
export async function getImages(): Promise<ImageItem[]> {
  try {
    const response = await fetch(`${API_URL}/images`, { 
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      cache: 'no-store' // Don't cache this request
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }
    
    const images = await response.json();
    
    return Array.isArray(images) 
      ? images.map(img => ({
          ...img,
          url: ensureCorrectUrl(img.url)
        }))
      : [];
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return [];
  }
}

// Get a specific image by ID - for server-side use
export async function getImageById(imageId: string): Promise<ImageItem | null> {
  try {
    const images = await getImages();
    return images.find(img => img.id === imageId) || null;
  } catch (error) {
    console.error(`Failed to fetch image with ID ${imageId}:`, error);
    return null;
  }
}