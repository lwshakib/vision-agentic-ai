import { fetchWithRetry } from '@/lib/utils';
import { s3Service } from '@/services/s3.services';
import {
  CLOUDFLARE_AI_GATEWAY_API_KEY,
  CLOUDFLARE_AI_GATEWAY_ENDPOINT,
} from '@/lib/env';
import { IMAGE_MODEL_ID } from '@/lib/constants';

export interface GenerateImageOptions {
  prompt: string;
  image_urls?: string[];
  num_inference_steps?: number;
  guidance?: number;
  seed?: number;
  width?: number;
  height?: number;
}

/**
 * Standalone Image Generation logic using FLUX via Cloudflare AI Gateway.
 */
export async function generateImage(options: GenerateImageOptions) {
  const {
    prompt,
    image_urls = [],
    num_inference_steps = 10,
    guidance = 3.5,
    seed,
    width = 512,
    height = 512,
  } = options;

  // 🛡️ Enforcement Guards
  const safeWidth = Math.min(width, 1024);
  const safeHeight = Math.min(height, 1024);
  const safeSteps = Math.min(num_inference_steps, 50);

  const images: string[] = [];

  // 🔄 Process Reference Images
  if (image_urls.length > 0) {
    console.log(
      `[llm:generateImage] Processing ${image_urls.length} reference images...`,
    );
    await Promise.all(
      image_urls.map(async (url: string) => {
        try {
          let actualUrl = url;
          if (!url.startsWith('http')) {
            actualUrl = await s3Service.getSignedUrl(url);
          }

          const imgRes = await fetchWithRetry(actualUrl);
          if (!imgRes.ok) throw new Error(`Fetch failed: ${imgRes.status}`);

          const buffer = Buffer.from(await imgRes.arrayBuffer());
          images.push(buffer.toString('base64'));
        } catch (e) {
          console.warn(
            `[llm:generateImage] Failed to process image ${url}:`,
            e,
          );
        }
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: IMAGE_MODEL_ID,
    prompt,
    width: safeWidth,
    height: safeHeight,
    num_inference_steps: safeSteps,
    guidance,
  };

  if (images.length > 0) {
    payload.images = images;
  }
  if (seed !== undefined) {
    payload.seed = seed;
  }

  const response = await fetch(CLOUDFLARE_AI_GATEWAY_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLOUDFLARE_AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Model error: ${response.status} - ${errorText.slice(0, 100)}`,
    );
  }

  const { image } = await response.json();
  if (!image) throw new Error('No image in response');

  const resultBuffer = Buffer.from(image, 'base64');
  const key = `generated/flux2-${Date.now()}.jpg`;
  const imageUrl = await s3Service.uploadFile(
    resultBuffer,
    key,
    'image/jpeg',
  );

  return {
    success: true,
    image: imageUrl,
    info: {
      model: IMAGE_MODEL_ID,
      mode: images.length > 0 ? 'img2img' : 'text2img',
      references: images.length,
      dimensions: `${safeWidth}x${safeHeight}`,
      steps: safeSteps,
    },
  };
}
