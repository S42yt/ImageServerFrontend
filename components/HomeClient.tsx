"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import ImageGallery from "./ImageGallery";
import { ImageItem } from "../lib/api";

export default function HomeClient({
  preloadedImages,
}: {
  preloadedImages: ImageItem[];
}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <>
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Upload Images</h2>
        <ImageUploader
          onUploadSuccess={() => setRefreshTrigger((n) => n + 1)}
        />
      </section>

      <section>
        <ImageGallery
          preloadedImages={preloadedImages}
          refreshTrigger={refreshTrigger}
        />
      </section>
    </>
  );
}
