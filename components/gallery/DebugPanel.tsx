import React from "react";

interface DebugPanelProps {
  currentSessionId: string;
  totalImages: number;
  userImages: number;
  showOnlyMine: boolean;
}

export default function DebugPanel({
  currentSessionId,
  totalImages,
  userImages,
  showOnlyMine,
}: DebugPanelProps) {
  return (
    <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded text-sm">
      <h3 className="font-bold mb-2">Debug Information</h3>
      <p>
        <strong>Current Session ID:</strong> {currentSessionId || "None"}
      </p>
      <p>
        <strong>Total Images:</strong> {totalImages}
      </p>
      <p>
        <strong>Your Images:</strong> {userImages}
      </p>
      <p>
        <strong>Filter Status:</strong>{" "}
        {showOnlyMine ? "Showing only your images" : "Showing all images"}
      </p>
    </div>
  );
}
