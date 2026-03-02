import { v2 as cloudinary } from 'cloudinary';
import { DEEPGRAM_API_KEY } from '@/lib/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function textToSpeech({ text }: { text: string }) {
  try {
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Missing DEEPGRAM_API_KEY');
    }

    const response = await fetch(
      'https://api.deepgram.com/v1/speak?model=aura-2-thalia-en',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Groq API error: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'vision-ai-studio/audio',
            resource_type: 'video', // Audio is treated as video resource type in Cloudinary usually
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
              });
            } else {
              reject(new Error('Upload returned no result'));
            }
          },
        )
        .end(buffer);
    });

    return {
      success: true,
      audioUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      text,
    };
  }
}
