import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUser } from '@/actions/user';

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
 * Type definition for a single image item in the library.
 */
type ImageItem = {
  id: string; // Unique identifier for the image part.
  url: string; // Public URL of the image.
  alt: string; // Alt text or filename.
  createdAt: string; // ISO string for the date.
};

/**
 * GET Handler - Fetches all image attachments from the user's chat messages.
 */
export async function GET() {
  // Authentication check.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all messages belonging to the user's chats from the database.
    const messages = await prisma.message.findMany({
      where: {
        chat: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        parts: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const allImages: ImageItem[] = [];

    // Process all fetched messages to extract individual images.
    for (const message of messages) {
      const parts = message.parts as MessagePart[] | null | undefined;
      if (!Array.isArray(parts)) continue;

      for (const part of parts) {
        if (!part || typeof part !== 'object') continue;

        const type = part.type;
        const mediaType = part.mediaType || '';
        const url = part.url;
        const name = part.name || part.filename || 'Image attachment';

        // 1. Process User-uploaded images (type: 'file' or 'attachment').
        const isFileLike = type === 'file' || type === 'attachment';
        const isImage = typeof mediaType === 'string' && mediaType.startsWith('image/');

        if (isFileLike && isImage && url) {
          allImages.push({
            id: part.id || `${url}-${message.createdAt.toISOString()}`,
            url,
            alt: name,
            createdAt: message.createdAt.toISOString(),
          });
        }

        // 2. Process Assistant-generated images (type: 'tool-generateImage').
        // The output contains 'image' (URL) and 'prompt' (which we'll use for alt text).
        const isGeneratedImage = type === 'tool-generateImage';
        const output = (part as any).output;
        
        if (isGeneratedImage && output?.success && output?.image) {
          allImages.push({
            id: part.id || `${output.image}-${message.createdAt.toISOString()}`,
            url: output.image,
            alt: output.prompt || 'Generated visual',
            createdAt: message.createdAt.toISOString(),
          });
        }
      }
    }

    /**
     * De-duplicate images based on URL.
     * Often, the same image might be used in multiple messages or retries.
     * In a library view, we typically want unique media assets.
     */
    const seenUrls = new Set<string>();
    const uniqueImages = allImages.filter((img) => {
      if (seenUrls.has(img.url)) return false;
      seenUrls.add(img.url);
      return true;
    });

    return NextResponse.json(uniqueImages);
  } catch (error) {
    console.error('Error fetching image library:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
