"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const cookieChoice = localStorage.getItem("cookie-consent");

    if (cookieChoice === null) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShowBanner(false);

    document.cookie =
      "session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 z-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between">
        <div className="mb-4 sm:mb-0 text-center sm:text-left">
          <p className="text-gray-700">
            This website uses cookies to enhance your browsing experience. We
            use these cookies for essential features like session management.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={declineCookies}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 transition rounded text-gray-800"
          >
            Decline
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 transition rounded text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
