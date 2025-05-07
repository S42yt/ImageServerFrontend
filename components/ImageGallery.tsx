"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { ImageItem } from "../lib/api";
import { useRouter } from "next/navigation";

interface ImageGalleryProps {
  preloadedImages?: ImageItem[];
  sharedImageId?: string;
  refreshTrigger?: number;
}

export default function ImageGallery({
  preloadedImages = [],
  sharedImageId,
  refreshTrigger = 0,
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(preloadedImages);
  const [filteredImages, setFilteredImages] =
    useState<ImageItem[]>(preloadedImages);
  const [loading, setLoading] = useState<boolean>(!preloadedImages.length);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [showOnlyMine, setShowOnlyMine] = useState<boolean>(false);
  const router = useRouter();
  const imageRefs = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionId = await api.getSession();
        setCurrentSessionId(sessionId);
        console.log(`Current session ID: ${sessionId}`);
      } catch (error) {
        console.error("Failed to fetch session:", error);
      }
    };

    fetchSession();
  }, [refreshTrigger]);

  useEffect(() => {
    // Apply the filter whenever showOnlyMine changes or images update
    if (showOnlyMine && currentSessionId) {
      setFilteredImages(
        images.filter((img) => img.sessionId === currentSessionId),
      );
    } else {
      setFilteredImages(images);
    }
  }, [showOnlyMine, images, currentSessionId]);

  const handleImageError = (imageId: string) => {
    console.error(`Failed to load image: ${imageId}`);
    setImageErrors((prev) => ({
      ...prev,
      [imageId]: true,
    }));
  };

  const canDeleteImage = useCallback(
    (image: ImageItem): boolean => {
      if (debugMode) {
        console.log(
          `Image ${image.id} - Session: ${image.sessionId}, Current: ${currentSessionId}`,
        );
      }
      return image.sessionId === currentSessionId;
    },
    [currentSessionId, debugMode],
  );

  const updateImageViewCount = useCallback(
    (imageId: string, newCount: number) => {
      setImages((prevImages) => {
        const updatedImages = prevImages.map((img) =>
          img.id === imageId ? { ...img, views: newCount } : img,
        );

        return api.sortImagesByViewCount(updatedImages);
      });

      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage((prev) =>
          prev ? { ...prev, views: newCount } : null,
        );
      }
    },
    [selectedImage],
  );

  useEffect(() => {
    if (sharedImageId && images.length > 0) {
      const sharedImage = images.find((img) => img.id === sharedImageId);
      if (sharedImage) {
        setSelectedImage(sharedImage);
        api
          .recordImageView(sharedImage.id)
          .then((result) => {
            if (result.success) {
              updateImageViewCount(sharedImage.id, result.count);
            }
          })
          .catch(console.error);
      }
    }
  }, [sharedImageId, images, updateImageViewCount]);

  useEffect(() => {
    if (preloadedImages.length > 0 && refreshTrigger === 0) {
      setImages(api.sortImagesByViewCount(preloadedImages));
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      try {
        const imageList = await api.getAllImages();

        const sortedImages = api.sortImagesByViewCount(
          Array.isArray(imageList) ? imageList : [],
        );

        setImages(sortedImages);

        setImageErrors({});
      } catch (error) {
        console.error("Failed to fetch images:", error);
        toast.error("Failed to load images");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [refreshTrigger, preloadedImages]);

  useEffect(() => {
    if (filteredImages.length > 0) {
      filteredImages.forEach((image) => {
        const imgRef = imageRefs.current[image.id];
        if (imgRef && !imageErrors[image.id]) {
          imgRef.src = api.getProxiedImageUrl(image.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredImages, imageErrors]);

  const handleViewImage = useCallback(
    async (image: ImageItem) => {
      setSelectedImage(image);

      try {
        const result = await api.recordImageView(image.id);
        if (result.success) {
          updateImageViewCount(image.id, result.count);
        }
      } catch (error) {
        console.error("Error recording view:", error);
      }
    },
    [updateImageViewCount],
  );

  const handleDelete = async (image: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!canDeleteImage(image)) {
      toast.error("You can only delete images that you've uploaded.");
      return;
    }

    if (!confirm(`Are you sure you want to delete this image?`)) {
      return;
    }

    try {
      await api.deleteImage(image.id);
      setImages(images.filter((img) => img.id !== image.id));
      toast.success("Image deleted successfully");

      if (selectedImage && selectedImage.id === image.id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleShare = (image: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareableLink = api.getShareableLink(image.id);
    navigator.clipboard.writeText(shareableLink);
    toast.success("Shareable link copied to clipboard");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  const toggleMyImagesFilter = () => {
    setShowOnlyMine(!showOnlyMine);
  };

  if (loading) {
    return <div className="text-center py-10">Loading images...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">
          No images found. Upload some images to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Images</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <label htmlFor="my-images-switch" className="mr-2 text-sm">
              Only show my images
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input
                id="my-images-switch"
                type="checkbox"
                checked={showOnlyMine}
                onChange={toggleMyImagesFilter}
                className="sr-only"
              />
              <div
                onClick={toggleMyImagesFilter}
                className={`toggle-bg block h-6 rounded-full w-10 cursor-pointer ${
                  showOnlyMine ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
              <div
                className={`toggle-dot absolute w-4 h-4 bg-white rounded-full shadow inset-y-0 left-0 m-1 transition-transform duration-200 ease-in ${
                  showOnlyMine ? "transform translate-x-4" : ""
                }`}
              ></div>
            </div>
          </div>
          <button
            onClick={toggleDebugMode}
            className="text-xs text-gray-500 underline"
          >
            {debugMode ? "Hide Debug Info" : "Show Debug Info"}
          </button>
        </div>
      </div>

      {debugMode && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded text-sm">
          <h3 className="font-bold mb-2">Debug Information</h3>
          <p>
            <strong>Current Session ID:</strong> {currentSessionId || "None"}
          </p>
          <p>
            <strong>Total Images:</strong> {images.length}
          </p>
          <p>
            <strong>Your Images:</strong>{" "}
            {images.filter((img) => img.sessionId === currentSessionId).length}
          </p>
          <p>
            <strong>Filter Status:</strong>{" "}
            {showOnlyMine ? "Showing only your images" : "Showing all images"}
          </p>
          <div className="mt-2">
            <button
              onClick={async () => {
                const sessionId = await api.getSession();
                setCurrentSessionId(sessionId);
                toast.info(`Session refreshed: ${sessionId}`);
              }}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
            >
              Refresh Session
            </button>
          </div>
        </div>
      )}

      {filteredImages.length === 0 && showOnlyMine && (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg mb-4">
          <p className="text-gray-500">You haven&apos;t uploaded any images yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className="bg-white rounded-lg shadow overflow-hidden transition-transform hover:scale-105 cursor-pointer"
            onClick={() => handleViewImage(image)}
          >
            {imageErrors[image.id] ? (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Image failed to load</p>
              </div>
            ) : (
              <div className="relative h-48 overflow-hidden">
               { /* eslint-disable-next-line @next/next/no-img-element*/}
                <img
                  ref={(el) => {
                    if (el) imageRefs.current[image.id] = el;
                  }}
                  alt={`Image ${image.id}`}
                  className="w-full h-full object-cover"
                  src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
                  onError={() => handleImageError(image.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-0 hover:opacity-60 transition-opacity flex items-end justify-center pb-2">
                  <div className="flex gap-2 p-1">
                    <button
                      onClick={(e) => handleShare(image, e)}
                      className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-700 transition"
                      title="Share image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(image, e)}
                      className={`p-1.5 text-white rounded transition ${canDeleteImage(image) ? "bg-red-500 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"}`}
                      title={
                        canDeleteImage(image)
                          ? "Delete image"
                          : "Can&apos;t delete (not yours)"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {canDeleteImage(image) && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                    Yours
                  </div>
                )}
              </div>
            )}
            <div className="p-3 bg-white">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 truncate">{image.id}</p>
                <div
                  className="flex items-center text-gray-400 text-xs"
                  title="View count"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {image.views || 0}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {formatFileSize(image.size)}
              </p>
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
            if (sharedImageId) {
              router.replace("/");
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
                  if (sharedImageId) {
                    router.replace("/");
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {imageErrors[selectedImage.id] ? (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center mb-4">
                  <p className="text-gray-500">Image failed to load</p>
                </div>
              ) : (
                <div className="relative">
                { /* eslint-disable-next-line @next/next/no-img-element*/}
                  <img
                    id={`modal-image-${selectedImage.id}`}
                    ref={(el) => {
                      if (el) {
                        imageRefs.current[`modal-${selectedImage.id}`] = el;
                        el.src = api.getProxiedImageUrl(selectedImage.id);
                      }
                    }}
                    alt={`Image ${selectedImage.id}`}
                    className="w-full max-h-[70vh] object-contain mb-4"
                    src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
                    onError={() => handleImageError(selectedImage.id)}
                  />
                  {canDeleteImage(selectedImage) && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Your upload
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p>
                      <strong>ID:</strong> {selectedImage.id}
                    </p>
                    <div
                      className="ml-auto flex items-center text-gray-500"
                      title="View count"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {selectedImage.views || 0} views
                    </div>
                  </div>
                  <p>
                    <strong>Size:</strong> {formatFileSize(selectedImage.size)}
                  </p>
                  <p>
                    <strong>Uploaded:</strong>{" "}
                    {formatDate(selectedImage.uploaded_at)}
                  </p>

                  <p className="mt-4">
                    <strong>Shareable Link:</strong>
                  </p>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      readOnly
                      value={api.getShareableLink(selectedImage.id)}
                      className="w-full p-2 border border-gray-300 rounded-l"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          api.getShareableLink(selectedImage.id),
                        );
                        toast.success("Shareable link copied to clipboard");
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-700 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                {canDeleteImage(selectedImage) ? (
                  <button
                    onClick={(e) => {
                      handleDelete(selectedImage, e);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 transition"
                  >
                    Delete Image
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                    title="You can only delete images you've uploaded"
                  >
                    Delete Image (Not Yours)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
