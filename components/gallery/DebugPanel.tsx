import React from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";

interface DebugPanelProps {
  currentSessionId: string;
  totalImages: number;
  userImages: number;
  showOnlyMine: boolean;
  onSessionRefresh: (sessionId: string) => void;
}

export default function DebugPanel({
  currentSessionId,
  totalImages,
  userImages,
  showOnlyMine,
  onSessionRefresh,
}: DebugPanelProps) {
  const refreshSession = async () => {
    const sessionId = await api.getSession();
    onSessionRefresh(sessionId);
    toast.info(`Session refreshed: ${sessionId}`);
  };

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
      <div className="mt-2">
        <button
          onClick={refreshSession}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
        >
          Refresh Session
        </button>
      </div>
    </div>
  );
}