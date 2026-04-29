import { createClient } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY } from '@/lib/env';
import { s3Service } from '@/services/s3.services';

/**
 * Deepgram Text-to-Speech service using Aura-2 models.
 */
export async function textToSpeech(
  text: string,
  voice: string = 'aura-2-orpheus-en'
): Promise<{ success: boolean; audioUrl: string }> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }

  const deepgram = createClient(DEEPGRAM_API_KEY);

  try {
    const response = await deepgram.speak.v1.audio.generate(
      { text },
      {
        model: voice,
        encoding: 'linear16',
        container: 'wav',
      }
    );

    const stream = await response.getStream();
    if (!stream) {
      throw new Error('Deepgram synthesis failed: No audio stream returned');
    }

    // Convert ReadableStream to Buffer
    const buffer = Buffer.from(await new Response(stream).arrayBuffer());

    const key = `tts/audio-${Date.now()}.wav`;
    const audioUrl = await s3Service.uploadFile(buffer, key, 'audio/wav');

    return { success: true, audioUrl };
  } catch (error) {
    console.error('Text-to-Speech Error:', error);
    throw error;
  }
}
