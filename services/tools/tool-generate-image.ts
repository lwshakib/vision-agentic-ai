import { z } from 'zod';
import { generateImage } from '@/services/llm';
import { ToolDefinition } from './types';

/**
 * tool: generateImage
 */
export const generateImageTool: ToolDefinition = {
  description:
    'Generate or edit high-quality images using FLUX.2 [klein] 9B. Supports text-to-image and multi-reference image-to-image (img2img).',
  schema: z.object({
    prompt: z.string().describe('Detailed description of the image to generate or the edits to apply.'),
    image_urls: z.array(z.string())
      .max(4)
      .optional()
      .describe('Optional array of up to 4 reference image URLs or S3 keys for image-to-image generation.'),
    num_inference_steps: z.number()
      .max(50)
      .default(10)
      .describe('Number of diffusion steps (max 50).'),
    guidance: z.number()
      .default(3.5)
      .describe('Controls how strictly the model follows the prompt.'),
    seed: z.number()
      .optional()
      .describe('Random seed for deterministic generation.'),
    width: z.number()
      .max(1024)
      .default(512)
      .describe('Width of the image in pixels (max 1024).'),
    height: z.number()
      .max(1024)
      .default(512)
      .describe('Height of the image in pixels (max 1024).'),
  }),
  execute: async (args) => {
    return generateImage(args);
  },
};
