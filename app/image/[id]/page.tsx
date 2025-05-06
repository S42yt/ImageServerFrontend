import { Suspense } from "react";
import { Metadata } from "next";
import { getImageById } from "../../../lib/server-api";
import { redirect } from "next/navigation";

interface ImagePageProps {
  params: {
    id: string;
  };
}

// Generate metadata for the page including OpenGraph and Twitter tags
export async function generateMetadata({
  params,
}: ImagePageProps): Promise<Metadata> {
  const image = await getImageById(params.id);

  // If the image doesn't exist, use default metadata
  if (!image) {
    return {
      title: "Image Not Found - ServerImages",
      description: "The requested image could not be found.",
    };
  }

  // Base URL for your site (needed for absolute URLs in meta tags)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  // Use proxy URL for social media previews to hide original domain
  const proxyUrl = `${baseUrl}/api/image/${image.id}`;

  return {
    title: `Image ${image.id} - ServerImages`,
    description: `View image ${image.id} on ServerImages Library`,
    openGraph: {
      title: `Image on ServerImages`,
      description: `Shared via ServerImages Library`,
      images: [
        {
          url: proxyUrl,
          width: 1200,
          height: 630,
          alt: `Image ${image.id}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Image on ServerImages`,
      description: `Shared via ServerImages Library`,
      images: [proxyUrl],
    },
  };
}

export default async function ImagePage({ params }: ImagePageProps) {
  const image = await getImageById(params.id);

  // If the image doesn't exist, redirect to the main page
  if (!image) {
    redirect("/");
  }

  // Generate proxied URL for this image
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const proxyUrl = `${baseUrl}/api/image/${image.id}`;

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Image Viewer</h1>
          <p className="text-gray-600">
            <a href="/" className="text-blue-500 hover:underline">
              &larr; Back to Image Library
            </a>
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-100 flex justify-between items-center">
            <h3 className="font-bold">Image Details</h3>
          </div>

          <div className="p-4">
            <Suspense
              fallback={
                <div className="text-center py-10">Loading image...</div>
              }
            >
              <div className="flex justify-center">
                <img
                  src={proxyUrl}
                  alt={`Image ${image.id}`}
                  className="max-w-full max-h-[70vh] object-contain mb-4"
                />
              </div>
              <div className="mt-4">
                <p>
                  <strong>ID:</strong> {image.id}
                </p>
                <p>
                  <strong>Size:</strong> {formatFileSize(image.size)}
                </p>
                <p>
                  <strong>Uploaded:</strong> {formatDate(image.uploaded_at)}
                </p>
              </div>
            </Suspense>
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>
            ServerImages - A simple image hosting library - &copy; Musa/S42{" "}
            {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
