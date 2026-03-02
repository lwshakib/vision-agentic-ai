/**
 * Image Library Page
 * This server-side component fetches and displays all images used in a user's chats.
 */

// Import prisma client for database access.
import prisma from '@/lib/prisma';
// Import action to get the current authenticated user.
import { getUser } from '@/actions/user';
// Import redirect for non-authenticated access.
import { redirect } from 'next/navigation';
// Import Next.js Image component for optimized image rendering.
import Image from 'next/image';

/**
 * Type definition for a single image item in the library.
 */
type ImageItem = {
  id: string; // Unique identifier for the image part.
  url: string; // Public URL of the image.
  alt: string; // Alt text or filename.
  createdAt: Date; // Timestamp of the message containing the image.
};

/**
 * Type definition for a message part as stored in the database.
 */
type MessagePart = {
  type?: string; // Type of part (e.g., 'text', 'file').
  mediaType?: string; // MIME type (e.g., 'image/png').
  url?: string; // URL if it's external media.
  name?: string; // Name of the file.
  filename?: string; // Alternative name field.
  id?: string; // ID of the part.
};

/**
 * Utility function to filter and transform message parts into a list of image items.
 * @param parts - Array of objects representing different parts of a message.
 * @param createdAt - The creation date of the original message.
 */
function extractImagesFromParts(
  parts: MessagePart[] | null | undefined,
  createdAt: Date,
): ImageItem[] {
  // Return empty array if no parts are provided.
  if (!Array.isArray(parts)) return [];

  const images: ImageItem[] = [];

  // Iterate over each part of the message.
  for (const part of parts) {
    // Skip invalid parts.
    if (!part || typeof part !== 'object') continue;

    const type = part.type;
    const mediaType = part.mediaType || '';
    const url = part.url;
    const name = part.name || part.filename || 'Image attachment';

    // Condition to identify an image file or attachment.
    const isFileLike = type === 'file' || type === 'attachment';
    const isImage =
      typeof mediaType === 'string' && mediaType.startsWith('image/');

    // If it matches our image criteria and has a URL, add it to the list.
    if (isFileLike && isImage && url) {
      images.push({
        id: part.id || `${url}-${createdAt.toISOString()}`,
        url,
        alt: name,
        createdAt,
      });
    }
  }

  return images;
}

/**
 * Main LibraryPage Component (Server Component)
 */
export default async function LibraryPage() {
  // Get current user session.
  const user = await getUser();

  // Redirect to sign-in if not logged in.
  if (!user) {
    redirect('/sign-in');
  }

  // Fetch all messages belonging to the user's chats from the database.
  const messages = await prisma.message.findMany({
    where: {
      chat: {
        userId: user.id, // Filter by current user ID.
      },
    },
    select: {
      id: true,
      parts: true, // Contains the JSON payload of message components.
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc', // Show newest images first.
    },
  });

  const allImages: ImageItem[] = [];

  // Process all fetched messages to extract individual images.
  for (const message of messages) {
    const parts = message.parts as MessagePart[] | null | undefined;
    const images = extractImagesFromParts(parts, message.createdAt);
    allImages.push(...images);
  }

  // De-duplicate images based on URL and timestamp.
  const seen = new Set<string>();
  const uniqueImages = allImages.filter((img) => {
    const key = `${img.url}-${img.createdAt.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
        {uniqueImages.length === 0 ? (
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
              {uniqueImages.map((image) => (
                <figure
                  key={image.id}
                  // Styling for each image card.
                  className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
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
                      {image.createdAt.toLocaleDateString()}
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
