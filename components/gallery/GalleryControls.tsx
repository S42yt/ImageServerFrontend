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
    <div className="mb-4 bg-white rounded-lg shadow p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold mb-3 sm:mb-0">Images</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center">
            <label htmlFor="sort-dropdown" className="mr-2 text-sm whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-dropdown"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="p-2 border border-gray-300 rounded bg-white flex-grow"
            >
              <option value="views">Most Viewed</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <label htmlFor="my-images-switch" className="mr-2 text-sm">
                Only my images
              </label>
              <button 
                onClick={onToggleMyImages}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showOnlyMine ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    showOnlyMine ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex justify-end">
        <button
          onClick={onToggleDebugMode}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {debugMode ? "Hide Debug Info" : "Show Debug Info"}
        </button>
      </div>
    </div>
  );
}