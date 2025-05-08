import React from "react";

interface GalleryControlsProps {
  sortOption: string;
  showOnlyMine: boolean;
  debugMode: boolean;
  onSortChange: (value: string) => void;
  onToggleMyImages: () => void;
  onToggleDebugMode: () => void;
}

export default function GalleryControls({
  sortOption,
  showOnlyMine,
  debugMode,
  onSortChange,
  onToggleMyImages,
  onToggleDebugMode,
}: GalleryControlsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold">Images</h2>
      <div className="flex items-center space-x-4">
        <div className="flex items-center mr-4">
          <label htmlFor="sort-dropdown" className="mr-2 text-sm">
            Sort by:
          </label>
          <select
            id="sort-dropdown"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          >
            <option value="views">Most Viewed</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
        <div className="flex items-center">
          <label htmlFor="my-images-switch" className="mr-2 text-sm">
            Only show my images
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input
              id="my-images-switch"
              type="checkbox"
              checked={showOnlyMine}
              onChange={onToggleMyImages}
              className="sr-only"
            />
            <div
              onClick={onToggleMyImages}
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
          onClick={onToggleDebugMode}
          className="text-xs text-gray-500 underline"
        >
          {debugMode ? "Hide Debug Info" : "Show Debug Info"}
        </button>
      </div>
    </div>
  );
}