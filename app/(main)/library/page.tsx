'use client';

/**
 * Image Library Page
 * This client-side component fetches and displays all images used in a user's chats.
 */

import { useState, useEffect } from 'react';
import prisma from '@/lib/prisma';
import { getUser } from '@/actions/user';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';

/**
 * Type definition for a single image item in the library.
 */
type ImageItem = {
  id: string; // Unique identifier for the image part.
  url: string; // Public URL of the image.
  alt: string; // Alt text or filename.
  createdAt: string; // ISO string from API.
};

/**
 * Main LibraryPage Component (Client Component)
 */
export default function LibraryPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { data: session, isPending: isAuthPending } = authClient.useSession();

  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isAuthPending, router]);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/library');
        if (response.ok) {
          const data = await response.json();
          setImages(data);
        }
      } catch (err) {
        console.error('Failed to fetch images:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (session) {
      fetchImages();
    }
  }, [session]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename.split('.')[0] + '.png'; // Ensure it has an extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  if (isAuthPending || isLoading) {
    return null; // Or a very simple loader that matches existing UI patterns if available
  }

  return (
    // Main layout container.
    <main className="flex min-h-screen flex-1 flex-col px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Page Header. */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Image Library
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            All images you&apos;ve ever attached or generated in your chats,
            collected in one place.
          </p>
        </header>

        {/* Conditional rendering for empty vs populated states. */}
        {images.length === 0 ? (
          // Empty state view.
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/40 p-10 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-base font-medium">No images yet</p>
              <p className="text-sm text-muted-foreground">
                Start a chat and attach or generate images. They&apos;ll appear
                here automatically.
              </p>
            </div>
          </div>
        ) : (
          // Library grid view using CSS columns for masonry layout.
          <section aria-label="Image library" className="w-full">
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {images.map((image) => (
                <figure
                  key={image.id}
                  // Styling for each image card.
                  className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <button
                    onClick={() => handleDownload(image.url, image.alt)}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
                    title="Download image"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <Image
                    src={image.url}
                    alt={image.alt}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                    width={400} // Base width for layout calculation.
                    height={300} // Base height for layout calculation.
                  />
                  {/* Image caption with alt text and date. */}
                  <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                    <span className="line-clamp-1">{image.alt}</span>
                    <span className="ml-2 shrink-0">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
