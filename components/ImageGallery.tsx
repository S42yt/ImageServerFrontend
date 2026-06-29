"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { ImageItem } from "../lib/api";
import { useRouter } from "next/navigation";
import GalleryControls from "./gallery/GalleryControls";
import DebugPanel from "./gallery/DebugPanel";
import ImageGrid from "./gallery/ImageGrid";
import ImageModal from "./gallery/ImageModal";

interface ImageGalleryProps {
  preloadedImages?: ImageItem[];
  sharedImageId?: string;
  newImage?: ImageItem | null;
  currentSessionId?: string;
}

export default function ImageGallery({
  preloadedImages = [],
  sharedImageId,
  newImage = null,
  currentSessionId = "",
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(preloadedImages);
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>(preloadedImages);
  const [loading, setLoading] = useState<boolean>(!preloadedImages.length);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [showOnlyMine, setShowOnlyMine] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>("views");
  const router = useRouter();
  const imageRefs = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setSelectedImage(null);
        if (sharedImageId) {
          router.replace("/");
        }
      } else {
        const image = images.find((img) => img.id === hash);
        if (image) {
          setSelectedImage(image);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [images, sharedImageId, router]);

  useEffect(() => {
    let resultImages = [...images];

    if (sortOption === "newest") {
      resultImages = api.sortImagesByNewest(resultImages);
    } else if (sortOption === "oldest") {
      resultImages = api.sortImagesByOldest(resultImages);
    } else {
      resultImages = api.sortImagesByViewCount(resultImages);
    }

    if (showOnlyMine && currentSessionId) {
      resultImages = resultImages.filter((img) => img.sessionId === currentSessionId);
    }

    setFilteredImages(resultImages);
  }, [showOnlyMine, sortOption, images, currentSessionId]);

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

  const fetchImages = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const imageList = await api.getAllImages();
      setImages(
        api.sortImagesByViewCount(Array.isArray(imageList) ? imageList : []),
      );
      setImageErrors({});
    } catch (error) {
      console.error("Failed to fetch images:", error);
      if (showLoading) toast.error("Failed to load images");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preloadedImages.length > 0) {
      setImages(api.sortImagesByViewCount(preloadedImages));
      setLoading(false);
      return;
    }
    fetchImages(true);
  }, [preloadedImages, fetchImages]);

  // Real-time stream: backend pushes upload/delete events over SSE.
  // EventSource auto-reconnects on drop.
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!base) return; // no backend URL; fallback poll below handles updates
    const es = new EventSource(`${base}/events`);

    es.addEventListener("image", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as ImageItem;
        setImages((prev) => {
          if (prev.some((img) => img.id === data.id)) return prev;
          const item = { ...data, url: api.getProxiedImageUrl(data.id) };
          return api.sortImagesByViewCount([item, ...prev]);
        });
      } catch (err) {
        console.error("Bad SSE image event:", err);
      }
    });

    es.addEventListener("delete", (e) => {
      try {
        const { id } = JSON.parse((e as MessageEvent).data);
        setImages((prev) => prev.filter((img) => img.id !== id));
      } catch (err) {
        console.error("Bad SSE delete event:", err);
      }
    });

    return () => es.close();
  }, []);

  // ponytail: 60s fallback poll in case a proxy buffers/blocks the SSE stream
  useEffect(() => {
    const id = setInterval(() => fetchImages(false), 60000);
    return () => clearInterval(id);
  }, [fetchImages]);

  // Optimistic insert: show a just-uploaded image immediately, no refetch.
  // It already carries the current session, so it renders as deletable ("yours").
  useEffect(() => {
    if (!newImage) return;
    setImages((prev) => {
      if (prev.some((img) => img.id === newImage.id)) return prev;
      return api.sortImagesByViewCount([newImage, ...prev]);
    });
  }, [newImage]);

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
      window.location.hash = image.id;

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
        window.location.hash = "";
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to delete image");
    }
  };

  const setImageRef = (id: string, el: HTMLImageElement | null) => {
    if (el) {
      imageRefs.current[id] = el;
      if (!imageErrors[id]) {
        el.src = api.getProxiedImageUrl(id.replace("modal-", ""));
      }
    }
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
      <GalleryControls
        sortOption={sortOption}
        showOnlyMine={showOnlyMine}
        debugMode={debugMode}
        onSortChange={setSortOption}
        onToggleMyImages={() => setShowOnlyMine(!showOnlyMine)}
        onToggleDebugMode={() => setDebugMode(!debugMode)}
      />

      {debugMode && (
        <DebugPanel
          currentSessionId={currentSessionId}
          totalImages={images.length}
          userImages={images.filter((img) => img.sessionId === currentSessionId).length}
          showOnlyMine={showOnlyMine}
        />
      )}

      <ImageGrid
        images={filteredImages}
        imageErrors={imageErrors}
        onViewImage={handleViewImage}
        onDelete={handleDelete}
        canDeleteImage={canDeleteImage}
        showOnlyMine={showOnlyMine}
        currentSessionId={currentSessionId}
        setImageRef={setImageRef}
      />

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => { window.location.hash = ""; }}
          onDelete={handleDelete}
          canDelete={canDeleteImage(selectedImage)}
          hasError={!!imageErrors[selectedImage.id]}
          setImageRef={setImageRef}
        />
      )}
    </div>
  );
}