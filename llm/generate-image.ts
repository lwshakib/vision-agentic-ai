/**
 * AI Image Generation Tool
 * Integrates with A4F (Imagen 3.5 model) to generate visuals from text prompts.
 * Automatically handles image hosting via Cloudinary.
 */

import { A4F_API_KEY } from '@/lib/env';
import { saveImageToCloudinary } from '@/lib/save-image-to-cloudinary';

/**
 * Main function to generate and host an image.
 */
export async function generateImage({
  prompt,
  width = '1024',
  height = '1024',
}: {
  prompt: string;
  width?: string;
  height?: string;
}) {
  // Validate that the required API key is present.
  if (!A4F_API_KEY) {
    throw new Error('Missing A4F_API_KEY');
  }

  try {
    // Format the resolution for the API.
    const size = `${width}x${height}`;

    // Step 1: Request image generation from the A4F API.
    const response = await fetch('https://api.a4f.co/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${A4F_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'provider-4/imagen-3.5', // Specify the target AI model.
        prompt,
        n: 1, // Number of images to generate.
        size,
      }),
    });

    // Handle API non-OK responses.
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    // Step 2: Extract the generated image data (either URL or Base64).
    const data = (await response.json()) as {
      data: { url?: string; b64_json?: string }[];
    };
    const image = data.data?.[0];

    if (!image) {
      throw new Error('No image generated in response');
    }

    let imageBuffer: Buffer;

    // Convert Base64 response to a binary Buffer.
    if (image.b64_json) {
      imageBuffer = Buffer.from(image.b64_json, 'base64');
    }
    // Or download the image from the temporary URL if returned instead.
    else if (image.url) {
      const imgRes = await fetch(image.url);
      if (!imgRes.ok) throw new Error('Failed to download image from URL');
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      throw new Error('Response contained neither URL nor base64 data');
    }

    // Step 3: Permanently host the generated image on Cloudinary.
    const uploadResult = await saveImageToCloudinary(imageBuffer);

    // Return the stable viewer URL and metadata.
    return {
      success: true,
      image: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      prompt,
      width,
      height,
      model: 'provider-4/imagen-3.5',
    };
  } catch (error) {
    // Catch-all for generation or upload failures.
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      prompt,
    };
  }
}
