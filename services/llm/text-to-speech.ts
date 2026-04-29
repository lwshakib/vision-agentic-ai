import { DeepgramClient } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY } from '@/lib/env';
import { s3Service } from '@/services/s3.services';

/**
 * Deepgram Text-to-Speech service using Aura-2 models.
 * Implementation updated to follow provided documentation snippet.
 */
export async function textToSpeech(
  text: string,
  voice: string = 'aura-2-orpheus-en'
): Promise<{ success: boolean; audioUrl: string }> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }

  // STEP 1: Create a Deepgram client with your API key
  const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

  try {
    // STEP 2: Make a request and configure the request with options
    const response = await deepgram.speak.v1.audio.generate(
      { text
        model: voice,
        encoding: 'linear16',
        container: 'wav',
      }
    );

    // STEP 3: Get the audio stream from the response
    const stream = response.stream;
    if (!stream) {
      throw new Error('Deepgram synthesis failed: No audio stream returned');
    }

    // STEP 4: Convert the stream to an audio buffer
    const buffer = await getAudioBuffer(stream);

    // STEP 5: Upload the audio buffer to S3
    const key = `tts/audio-${Date.now()}.wav`;
    const audioUrl = await s3Service.uploadFile(buffer, key, 'audio/wav');

    return { success: true, audioUrl };
  } catch (error) {
    console.error('Text-to-Speech Error:', error);
    throw error;
  }
}

/**
 * Helper function to convert stream to audio buffer
 * Follows the logic from the provided documentation snippet.
 */
async function getAudioBuffer(response: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = response.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // Combine chunks into a single Uint8Array efficiently
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(result.buffer);
}
