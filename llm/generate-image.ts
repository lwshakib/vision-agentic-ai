import { A4F_API_KEY } from '@/lib/env';
import { saveImageToCloudinary } from '@/lib/save-image-to-cloudinary';

export async function generateImage({
  prompt,
  width = 1024,
  height = 1024,
}: {
  prompt: string;
  width?: number;
  height?: number;
}) {
  if (!A4F_API_KEY) {
    throw new Error('Missing A4F_API_KEY');
  }

  try {
    const size = `${width}x${height}`;
    const response = await fetch('https://api.a4f.co/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${A4F_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'provider-4/imagen-3.5',
        prompt,
        n: 1,
        size,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data: { url?: string; b64_json?: string }[];
    };
    const image = data.data?.[0];

    if (!image) {
      throw new Error('No image generated in response');
    }

    let imageBuffer: Buffer;

    if (image.b64_json) {
      imageBuffer = Buffer.from(image.b64_json, 'base64');
    } else if (image.url) {
      const imgRes = await fetch(image.url);
      if (!imgRes.ok) throw new Error('Failed to download image from URL');
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      throw new Error('Response contained neither URL nor base64 data');
    }

    // Upload to Cloudinary using utility
    const uploadResult = await saveImageToCloudinary(imageBuffer);

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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      prompt,
    };
  }
}
