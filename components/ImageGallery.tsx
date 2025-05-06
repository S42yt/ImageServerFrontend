'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from 'react-toastify';
import { ImageItem } from '../lib/api';
import { useRouter } from 'next/navigation';

interface ImageGalleryProps {
  preloadedImages?: ImageItem[]; // Images preloaded from server
  sharedImageId?: string; // ID of image shared via URL
  refreshTrigger?: number;
}

export default function ImageGallery({ preloadedImages = [], sharedImageId, refreshTrigger = 0 }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(preloadedImages);
  const [loading, setLoading] = useState<boolean>(!preloadedImages.length);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Handle image loading errors
  const handleImageError = (imageId: string, url: string) => {
    console.error(`Failed to load image: ${imageId}`);
    console.error(`Image URL that failed: ${url}`);
    setImageErrors(prev => ({
      ...prev,
      [imageId]: true
    }));
  };

  // Effect to handle shared image
  useEffect(() => {
    if (sharedImageId && images.length > 0) {
      const sharedImage = images.find(img => img.id === sharedImageId);
      if (sharedImage) {
        setSelectedImage(sharedImage);
      }
    }
  }, [sharedImageId, images]);

  // Fetch all images if needed (client-side refresh)
  useEffect(() => {
    // If we have preloaded images and it's the first render, don't fetch again
    if (preloadedImages.length > 0 && refreshTrigger === 0) {
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      try {
        const imageList = await api.getAllImages();
        
        console.log('Fetched images:', imageList);
        if (imageList.length > 0) {
          console.log('First image URL:', imageList[0].url);
        }
        
        // Ensure imageList is always an array
        setImages(Array.isArray(imageList) ? imageList : []);
        
        // Reset image errors on refresh
        setImageErrors({});
      } catch (error) {
        console.error('Failed to fetch images:', error);
        toast.error('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [refreshTrigger, preloadedImages.length]);

  // Handle image deletion
  const handleDelete = async (image: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the image modal from opening
    
    if (!confirm(`Are you sure you want to delete this image?`)) {
      return;
    }
    
    try {
      await api.deleteImage(image.id);
      setImages(images.filter(img => img.id !== image.id));
      toast.success('Image deleted successfully');
      
      // Close the modal if the deleted image is currently selected
      if (selectedImage && selectedImage.id === image.id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    }
  };

  // Share image link
  const handleShare = (image: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the image modal from opening
    const shareableLink = api.getShareableLink(image.id);
    navigator.clipboard.writeText(shareableLink);
    toast.success('Shareable link copied to clipboard');
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="text-center py-10">Loading images...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">No images found. Upload some images to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Your Images</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div 
            key={image.id}
            className="bg-white rounded-lg shadow overflow-hidden transition-transform hover:scale-105 cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            {imageErrors[image.id] ? (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Image failed to load</p>
              </div>
            ) : (
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={image.url} 
                  alt={`Image ${image.id}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(image.id, image.url)}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-0 hover:opacity-60 transition-opacity flex items-end justify-center pb-2">
                  <div className="flex gap-2 p-1">
                    <button 
                      onClick={(e) => handleShare(image, e)}
                      className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-700 transition"
                      title="Share image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(image, e)}
                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-700 transition"
                      title="Delete image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="p-3 bg-white">
              <p className="text-sm text-gray-500 truncate">{image.id}</p>
              <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedImage(null);
            // Remove the id parameter from URL when closing the modal
            if (sharedImageId) {
              router.replace('/');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-100 flex justify-between items-center">
              <h3 className="font-bold">Image Details</h3>
              <button 
                onClick={() => {
                  setSelectedImage(null);
                  // Remove the id parameter from URL when closing the modal
                  if (sharedImageId) {
                    router.replace('/');
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {imageErrors[selectedImage.id] ? (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center mb-4">
                  <p className="text-gray-500">Image failed to load</p>
                </div>
              ) : (
                <img 
                  src={selectedImage.url} 
                  alt={`Image ${selectedImage.id}`}
                  className="w-full max-h-[70vh] object-contain mb-4"
                  onError={() => handleImageError(selectedImage.id, selectedImage.url)}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>ID:</strong> {selectedImage.id}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedImage.size)}</p>
                  <p><strong>Uploaded:</strong> {formatDate(selectedImage.uploaded_at)}</p>
                </div>
                <div>
                  <p><strong>Direct URL:</strong></p>
                  <input
                    type="text"
                    readOnly
                    value={selectedImage.url}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <p className="mt-2"><strong>Shareable Link:</strong></p>
                  <input
                    type="text"
                    readOnly
                    value={api.getShareableLink(selectedImage.id)}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedImage.url);
                    toast.success('Direct URL copied to clipboard');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700 transition"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(api.getShareableLink(selectedImage.id));
                    toast.success('Shareable link copied to clipboard');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition"
                >
                  Copy Share Link
                </button>
                <button
                  onClick={(e) => {
                    handleDelete(selectedImage, e);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 transition"
                >
                  Delete Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}