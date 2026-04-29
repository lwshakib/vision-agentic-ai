import { z } from 'zod';
import { generateImage } from '@/services/llm';
import { ToolDefinition } from './types';

/**
 * tool: generateImage
 */
export const generateImageTool: ToolDefinition = {
  description:
    "Generate or edit high-quality images using Gemini's Nano Banana (Gemini 3.1 Flash Image). Supports text-to-image, image-to-image (up to 14 references), and complex visual reasoning.",
  schema: z.object({
    prompt: z
      .string()
      .describe(
        'Detailed description of the image to generate or the edits to apply.',
      ),
    image_urls: z
      .array(z.string())
      .max(14)
      .optional()
      .describe(
        'Optional array of up to 14 reference image URLs or S3 keys. Up to 4 characters for consistency and 10 objects for fidelity.',
      ),
    aspect_ratio: z
      .enum([
        '1:1',
        '1:4',
        '1:8',
        '2:3',
        '3:2',
        '3:4',
        '4:1',
        '4:3',
        '4:5',
        '5:4',
        '8:1',
        '9:16',
        '16:9',
        '21:9',
      ])
      .default('1:1')
      .describe('The desired aspect ratio for the generated image.'),
    image_size: z
      .enum(['512', '1K', '2K', '4K'])
      .default('1K')
      .describe('The target resolution (1K is default).'),
    thinking_level: z
      .enum(['minimal', 'high'])
      .default('minimal')
      .describe(
        'Controls the amount of reasoning used (minimal is faster, high is better quality).',
      ),
  }),
  execute: async (args) => {
    return generateImage(args as any);
  },
};
