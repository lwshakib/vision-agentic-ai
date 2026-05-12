import { z } from 'zod';
import { ToolDefinition } from './types';
import { fetchWithRetry } from '@/lib/utils';

/**
 * tool: readImageUrl
 * Allows the AI to fetch and "see" an image from a URL provided in text.
 */
export const readImageUrlTool: ToolDefinition = {
  description:
    'Fetch and analyze an image from a publicly accessible URL. Use this when the user provides an image link in the chat instead of uploading a file.',
  schema: z.object({
    url: z.string().url().describe('The absolute URL of the image to fetch.'),
  }),
  execute: async ({ url }) => {
    try {
      const res = await fetchWithRetry(url);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch image from URL: ${res.status} ${res.statusText}`,
        );
      }

      const contentType = res.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        throw new Error(
          `The provided URL does not point to a valid image (Content-Type: ${contentType})`,
        );
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const base64Data = buffer.toString('base64');

      return {
        success: true,
        url,
        mimeType: contentType,
        data: base64Data,
        message:
          'Image fetched successfully. You can now analyze the content of this image using your vision capabilities.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
