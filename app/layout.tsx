import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import CookieConsent with no SSR to avoid hydration errors
const CookieConsent = dynamic(() => import("../components/CookieConsent"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "ServerImages Library",
  description: "A simple image hosting library for ServerImages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
