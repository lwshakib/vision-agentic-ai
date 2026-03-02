/**
 * Text-to-Speech (TTS) Utility
 * Converts text into audio using the Deepgram API.
 * Automatically handles audio hosting on Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';
import { DEEPGRAM_API_KEY } from '@/lib/env';

/**
 * Configure Cloudinary for audio storage.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Main TTS function.
 * @param text - The content to be converted to speech.
 */
export async function textToSpeech({ text }: { text: string }) {
  try {
    // Check for required API key.
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Missing DEEPGRAM_API_KEY');
    }

    // Step 1: Request audio generation from Deepgram.
    const response = await fetch(
      'https://api.deepgram.com/v1/speak?model=aura-2-thalia-en',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg', // Request MP3 format.
        },
        body: JSON.stringify({ text }),
      },
    );

    // Handle Deepgram-specific errors.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Groq API error: ${response.statusText}`,
      );
    }

    // Convert the audio stream into a Buffer for Cloudinary.
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 2: Upload the binary audio data to Cloudinary.
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'vision-ai-studio/audio',
            resource_type: 'video', // Audio is treated as 'video' resource type in Cloudinary.
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

    // Return the successful audio URL and metadata.
    return {
      success: true,
      audioUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      text,
    };
  } catch (error) {
    // Return a structured error response for UI handling.
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      text,
    };
  }
}
