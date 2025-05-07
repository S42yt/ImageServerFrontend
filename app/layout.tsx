import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { lazy } from "react";

const CookieConsent = lazy(() => import("../components/CookieConsent"));
const ToastWrapper = lazy(() => import("../components/ToastWrapper"));

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
        <Suspense fallback={null}>
          <ToastWrapper />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
