/**
 * Text-to-Speech (TTS) Utility using Aura-2
 * Orchestrates audio generation via Cloudflare Workers and persistence via Cloudinary.
 */

import * as env from '@/lib/env';
import { saveAudioToCloudinary } from '@/lib/cloudinary';
import { auraSpeakers } from '@/lib/characters';
import { SPEECH_CHARACTER_LIMIT } from '@/lib/constants';

export interface TextToSpeechOptions {
  text: string;
  voice?: string;
}

export interface TextToSpeechResult {
  success: boolean;
  buffer?: Buffer;
  audioUrl?: string;
  text: string;
  error?: string;
}

/**
 * Splits text into chunks of a specific length, attempting to break at sentences or spaces.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + maxLength;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Try to find a good breaking point (period, newline, or space)
    const segment = text.slice(start, end);
    let breakPoint = -1;

    // Search for the last sentence end or newline in the segment
    const lastDot = segment.lastIndexOf('.');
    const lastExclamation = segment.lastIndexOf('!');
    const lastQuestion = segment.lastIndexOf('?');
    const lastNewline = segment.lastIndexOf('\n');
    
    breakPoint = Math.max(lastDot, lastExclamation, lastQuestion, lastNewline);

    if (breakPoint === -1) {
      // Fallback to last space if no sentence end found
      breakPoint = segment.lastIndexOf(' ');
    }

    if (breakPoint === -1) {
      // Hard cut if absolutely no spaces found
      breakPoint = maxLength;
    } else {
      // Include the separator
      breakPoint += 1;
    }

    chunks.push(text.slice(start, start + breakPoint).trim());
    start += breakPoint;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Communicates with the Aura-2 Cloudflare Worker to generate realistic speech.
 * Handles text chunking and audio merging for texts exceeding the character limit.
 */
export const textToSpeech = async ({
  text,
  voice = 'orpheus',
}: TextToSpeechOptions): Promise<TextToSpeechResult> => {
  try {
    const workerURL = env.AURA_2_EN_WORKER_URL;
    if (!workerURL) throw new Error('AURA_2_EN_WORKER_URL is not configured');

    const chunks = splitTextIntoChunks(text, SPEECH_CHARACTER_LIMIT - 50);
    const audioBuffers: Buffer[] = [];

    // Process chunks sequentially to maintain order
    for (const chunk of chunks) {
      const response = await fetch(workerURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.CLOUDFLARE_API_KEY}`,
        },
        body: JSON.stringify({
          text: chunk,
          speaker: voice,
          encoding: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Aura-2 API Error: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    const mergedBuffer = Buffer.concat(audioBuffers);
    
    // Upload the final combined audio to Cloudinary for UI playback
    const { url: audioUrl } = await saveAudioToCloudinary(mergedBuffer);

    return {
      success: true,
      buffer: mergedBuffer,
      audioUrl,
      text,
    };
  } catch (error) {
    console.error('[TEXT_TO_SPEECH_ERROR]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      text,
    };
  }
};

/**
 * Orchestrates the full audio generation pipeline:
 * 1. Converts each script segment to speech in parallel.
 * 2. Merges all generated audio buffers.
 * 3. Uploads the final combined audio to Cloudinary.
 */
export const generateAudioFile = async (segments: { content: string; voice: string }[]) => {
  const audioBuffers = await Promise.all(
    segments.map(async (segment) => {
      const { success, buffer } = await textToSpeech({
        text: segment.content,
        voice: segment.voice,
      });
      return success && buffer ? buffer : null;
    })
  );

  const validBuffers = audioBuffers.filter((b): b is Buffer => b !== null);

  if (validBuffers.length === 0) {
    throw new Error('Failed to generate any audio segments');
  }

  const mergedBuffer = Buffer.concat(validBuffers);

  // Upload the final merged audio to Cloudinary
  const { url: audioUrl, publicId } = await saveAudioToCloudinary(mergedBuffer);

  return {
    audioUrl,
    publicId,
  };
};

export { auraSpeakers };
