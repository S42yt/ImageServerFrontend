"use client"; // Mark as client component

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { Turnstile } from "@marsidev/react-turnstile";
import { ImageItem } from "../lib/api";

interface ImageUploaderProps {
  onUploadSuccess?: (newImage?: ImageItem) => void; // Update the type to pass the new image
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ImageUploader({ onUploadSuccess }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const turnstileRef = useRef<any>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      if (!turnstileToken) {
        toast.error("Please complete the CAPTCHA challenge first.");
        turnstileRef.current?.reset();
        return;
      }

      try {
        setUploading(true);

        const initialProgress: Record<string, number> = {};
        acceptedFiles.forEach((file) => {
          initialProgress[file.name] = 0;
        });
        setUploadProgress(initialProgress);

        const uploadPromises = acceptedFiles.map((file) => {
          if (!file.type.startsWith("image/")) {
            toast.error(`File "${file.name}" is not an image`);
            return null;
          }

          const toastId = toast.loading(`Uploading "${file.name}"...`, {
            closeButton: true,
            closeOnClick: false,
          });

          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              const currentProgress = prev[file.name] || 0;

              const newProgress = Math.min(currentProgress + 5, 90);
              return { ...prev, [file.name]: newProgress };
            });
          }, 300);

          return api
            .uploadImage(file, turnstileToken)
            .then((response) => {
              clearInterval(progressInterval);
              setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

              toast.update(toastId, {
                render: `File "${file.name}" uploaded successfully`,
                type: "success",
                isLoading: false,
                autoClose: 3000,
              });

              if (onUploadSuccess && response) {
                onUploadSuccess(response);
              }

              return response;
            })
            .catch((error) => {
              clearInterval(progressInterval);

              console.error("Upload error:", error);
              const errorMessage =
                error.response?.data?.error ||
                `Failed to upload "${file.name}"`;

              toast.update(toastId, {
                render: errorMessage,
                type: "error",
                isLoading: false,
                autoClose: 5000,
              });

              if (
                errorMessage.toLowerCase().includes("captcha") ||
                errorMessage.toLowerCase().includes("turnstile")
              ) {
                turnstileRef.current?.reset();
                setTurnstileToken(null);
              }
              return null;
            });
        });

        await Promise.all(uploadPromises.filter(Boolean));
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("An error occurred during upload");
      } finally {
        setUploading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setUploadProgress({});
      }
    },
    [onUploadSuccess, turnstileToken],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    disabled: uploading || !turnstileToken,
  });

  if (!TURNSTILE_SITE_KEY) {
    console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.");
    return (
      <div className="text-red-500 font-bold p-4 border border-red-500 rounded">
        Turnstile Site Key is missing. Please configure it in your environment
        variables.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          onError={() =>
            toast.error("CAPTCHA challenge failed. Please try again.")
          }
          onExpire={() => {
            toast.warn("CAPTCHA challenge expired. Please complete it again.");
            setTurnstileToken(null);
          }}
          options={{
            theme: "light",
          }}
        />
      </div>

      <div
        {...getRootProps()}
        className={`dropzone w-full p-8 border-2 border-dashed rounded-lg transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } ${
          uploading || !turnstileToken
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-center text-gray-500">
            <p className="mb-2">Uploading...</p>
            {/* Show progress bars for each file */}
            {Object.keys(uploadProgress).map((fileName) => (
              <div key={fileName} className="mb-2">
                <div className="text-xs text-gray-500 mb-1">{fileName}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[fileName]}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : isDragActive ? (
          <p className="text-center text-blue-500">Drop the images here...</p>
        ) : (
          <div className="text-center">
            <p className="text-gray-500">
              {turnstileToken
                ? "Drag & drop images here, or click to select files"
                : "Complete the CAPTCHA above to enable upload"}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Only image files are accepted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
