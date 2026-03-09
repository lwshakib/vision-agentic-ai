import { CLOUDFLARE_API_KEY, FLUX_KLEIN_WORKER_URL } from '@/lib/env';
import { saveImageToCloudinary } from '@/lib/cloudinary';

/**
 * Supported generation modes for the Flux Klein model.
 */
export type GenerateImageMode = 'text-to-image' | 'image-to-image' | 'blend' | 'inpaint';

/**
 * Options for generating an image.
 */
export interface GenerateImageOptions {
  /** The operation mode. Defaults to 'text-to-image'. */
  mode?: GenerateImageMode;
  /** The textual description of the desired result. */
  prompt: string;
  /** Input images for the selected mode (variations, blending, or inpainting). */
  images?: (Blob | Buffer | File)[];
  /** Mask for inpainting (White = change, Black = keep). */
  mask?: Blob | Buffer | File;
  /** Influence of input image (0.0=original, 1.0=new). Defaults to 1.0. */
  strength?: number;
  /** Output width. Defaults to 1024. */
  width?: number;
  /** Output height. Defaults to 1024. */
  height?: number;
  /** Optimization steps. Recommended 20-35. Defaults to 28. */
  steps?: number;
  /** Set for deterministic/repeatable results. */
  seed?: number;
}

/**
 * The result of an image generation operation.
 */
export interface GenerateImageResult {
  success: boolean;
  /** The URL of the generated image (persisted in Cloudinary). */
  image?: string;
  /** The Cloudinary public ID. */
  publicId?: string;
  /** The prompt used for generation. */
  prompt: string;
  /** The final width of the image. */
  width?: number;
  /** The final height of the image. */
  height?: number;
  /** The model name used. */
  model: string;
  /** Error message if success is false. */
  error?: string;
}

const MODEL_NAME = 'FLUX.2 [klein] 9B';

/**
 * Generates or manipulates an image using the Flux Klein model.
 * Handles single prompt generation, image variations, and blending.
 *
 * @param options - Prompt, mode, and optional input images/masks.
 * @returns Object containing the Cloudinary URL and metadata.
 */
export const generateImage = async (
  options: GenerateImageOptions
): Promise<GenerateImageResult> => {
  const {
    mode = 'text-to-image',
    prompt,
    images,
    mask,
    strength = 1.0,
    width = 1024,
    height = 1024,
    steps = 28,
    seed,
  } = options;

  if (!CLOUDFLARE_API_KEY) {
    console.error('[GENERATE_IMAGE] Missing CLOUDFLARE_API_KEY');
    return {
      success: false,
      error: 'Missing CLOUDFLARE_API_KEY',
      prompt,
      model: MODEL_NAME,
    };
  }

  try {
    let response: Response;

    // Determine if we should use JSON or FormData
    const isFormDataNeeded = mode !== 'text-to-image' || (images && images.length > 0) || !!mask;

    if (!isFormDataNeeded) {
      // Simple Text-to-Image (JSON)
      response = await fetch(FLUX_KLEIN_WORKER_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          steps,
          seed,
        }),
      });
    } else {
      // Advanced Workflows (FormData)
      const form = new FormData();
      form.append('prompt', prompt);
      if (width) form.append('width', width.toString());
      if (height) form.append('height', height.toString());
      if (steps) form.append('steps', steps.toString());
      if (seed !== undefined) form.append('seed', seed.toString());

      if (images && images.length > 0) {
        if (mode === 'image-to-image' || mode === 'inpaint') {
          form.append('image', images[0] as Blob);
        }

        // Always provide indexed images for modes like 'blend' or multi-image workflows
        images.forEach((img, index) => {
          form.append(`image${index}`, img as Blob);
        });
      }

      if (mode === 'image-to-image' || mode === 'inpaint') {
        if (strength !== undefined) form.append('strength', strength.toString());
        if (mode === 'inpaint' && mask) {
          form.append('mask', mask as Blob);
        }
      }

      response = await fetch(FLUX_KLEIN_WORKER_URL!, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
        },
        body: form,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE_IMAGE] API Error: ${response.status} - ${errorText}`);
      throw new Error(`Image generation failed (${response.status}): ${errorText}`);
    }

    // The worker returns the raw image binary (image/png)
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Persist resulting image to Cloudinary for stable hosting
    const uploadResult = await saveImageToCloudinary(imageBuffer);

    return {
      success: true,
      image: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      prompt,
      width,
      height,
      model: MODEL_NAME,
    };
  } catch (error) {
    console.error('[GENERATE_IMAGE_EXCEPTION]', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during image generation',
      prompt,
      model: MODEL_NAME,
    };
  }
};
