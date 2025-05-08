import React from "react";
import { ImageItem } from "@/lib/api";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: ImageItem[];
  imageErrors: Record<string, boolean>;
  onViewImage: (image: ImageItem) => void;
  onDelete: (image: ImageItem, e: React.MouseEvent) => void;
  canDeleteImage: (image: ImageItem) => boolean;
  showOnlyMine: boolean;
  currentSessionId: string;
  setImageRef: (id: string, el: HTMLImageElement | null) => void;
}

export default function ImageGrid({
  images,
  imageErrors,
  onViewImage,
  onDelete,
  canDeleteImage,
  showOnlyMine,
  setImageRef,
}: ImageGridProps) {
  if (images.length === 0 && showOnlyMine) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg mb-4">
        <p className="text-gray-500">You haven&apos;t uploaded any images yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          onViewImage={onViewImage}
          onDelete={onDelete}
          canDelete={canDeleteImage(image)}
          hasError={!!imageErrors[image.id]}
          imageRef={(el) => setImageRef(image.id, el)}
        />
      ))}
    </div>
  );
}