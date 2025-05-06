import { Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ImageUploader from '../components/ImageUploader';
import ImageGallery from '../components/ImageGallery';
import { Metadata } from 'next';
import { getImages } from '../lib/server-api';

export const metadata: Metadata = {
  title: 'ServerImages Library',
  description: 'A simple image hosting library using the ServerImages backend',
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function Home({ searchParams }: PageProps) {
  const preloadedImages = await getImages();
  const sharedImageId = searchParams.id as string | undefined;

  return (
    <main className="min-h-screen p-6 md:p-12">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Image Library</h1>
          <p className="text-gray-600">A simple image hosting library using the ServerImages backend</p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Upload Images</h2>
          <ImageUploader />
        </section>

        <section>
          <Suspense fallback={<div className="text-center py-10">Loading images...</div>}>
            <ImageGallery preloadedImages={preloadedImages} sharedImageId={sharedImageId} />
          </Suspense>
        </section>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>ServerImages - A simple image hosting library using the ServerImages backend - &copy; Musa/S42 {new Date().getFullYear()}</p>
          <p className='hover:underline text-blue-500 cursor-pointer'>
            <a href="https://github.com/S42yt/ServerImages" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}