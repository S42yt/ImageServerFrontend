import React from "react";
import { ImageItem } from "@/lib/api";
import { api } from "@/lib/api";
import { toast } from "react-toastify";

interface ImageModalProps {
  image: ImageItem;
  onClose: () => void;
  onDelete: (image: ImageItem, e: React.MouseEvent) => void;
  canDelete: boolean;
  hasError: boolean;
  setImageRef: (id: string, el: HTMLImageElement | null) => void;
}

export default function ImageModal({
  image,
  onClose,
  onDelete,
  canDelete,
  hasError,
  setImageRef,
}: ImageModalProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-gray-100 flex justify-between items-center">
          <h3 className="font-bold">Image Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
          {hasError ? (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center mb-4">
              <p className="text-gray-500">Image failed to load</p>
            </div>
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element*/}
              <img
                id={`modal-image-${image.id}`}
                ref={(el) => setImageRef(`modal-${image.id}`, el)}
                alt={`Image ${image.id}`}
                className="w-full max-h-[50vh] object-contain mb-4"
                src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
              />
              {canDelete && (
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
                  <strong>ID:</strong> {image.id}
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
                  {image.views || 0} views
                </div>
              </div>
              <p>
                <strong>Size:</strong> {formatFileSize(image.size)}
              </p>
              <p>
                <strong>Uploaded:</strong> {formatDate(image.uploaded_at)}
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-1">
                    <strong>Embedded Link:</strong>
                  </p>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={api.getEmbededLink(image.id)}
                      className="w-full p-2 border border-gray-300 rounded-l"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          api.getEmbededLink(image.id)
                        );
                        toast.success("Embedded link copied to clipboard");
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-700 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium mb-1">
                    <strong>Direct Image Link:</strong>
                  </p>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={api.getImageLink(image.id)}
                      className="w-full p-2 border border-gray-300 rounded-l"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          api.getImageLink(image.id)
                        );
                        toast.success("Image link copied to clipboard");
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-700 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            {canDelete ? (
              <button
                onClick={(e) => onDelete(image, e)}
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
  );
}