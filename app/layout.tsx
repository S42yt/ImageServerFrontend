import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ServerImages Library',
  description: 'A simple image hosting library for ServerImages',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}