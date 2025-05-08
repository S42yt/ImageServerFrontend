import React from "react";
import { ImageItem } from "@/lib/api";
import { api } from "@/lib/api";
import { toast } from "react-toastify";

interface ImageCardProps {
  image: ImageItem;
  onViewImage: (image: ImageItem) => void;
  onDelete: (image: ImageItem, e: React.MouseEvent) => void;
  canDelete: boolean;
  hasError: boolean;
  imageRef: (el: HTMLImageElement | null) => void;
}

export default function ImageCard({
  image,
  onViewImage,
  onDelete,
  canDelete,
  hasError,
  imageRef,
}: ImageCardProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareableLink = api.getEmbededLink(image.id);
    navigator.clipboard.writeText(shareableLink);
    toast.success("Shareable link copied to clipboard");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      className="bg-white rounded-lg shadow overflow-hidden transition-transform hover:scale-102 active:scale-98 cursor-pointer touch-manipulation"
      onClick={() => onViewImage(image)}
    >
      {hasError ? (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Image failed to load</p>
        </div>
      ) : (
        <div className="relative h-48 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element*/}
          <img
            ref={imageRef}
            alt={`Image ${image.id}`}
            className="w-full h-full object-cover"
            src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-0 hover:opacity-70 transition-opacity flex items-end justify-center pb-2">
            <div className="flex gap-2 p-2">
              <button
                onClick={handleShare}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                title="Share image"
                aria-label="Share image"
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
                onClick={(e) => onDelete(image, e)}
                className={`p-2 text-white rounded transition ${canDelete ? "bg-red-500 hover:bg-red-600" : "bg-gray-400 cursor-not-allowed"}`}
                title={canDelete ? "Delete image" : "Can't delete (not yours)"}
                disabled={!canDelete}
                aria-label={canDelete ? "Delete image" : "Can't delete (not yours)"}
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
          {canDelete && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded shadow">
              Yours
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 truncate">{image.id}</p>
          <div className="flex items-center text-gray-400 text-xs" title="View count">
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
        <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
      </div>
    </div>
  );
}