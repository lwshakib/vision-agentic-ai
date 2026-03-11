import {
  CLOUDFLARE_API_KEY,
  WHISPER_LARGE_V3_TURBO_WORKER_URL,
} from '@/lib/env';

/**
 * Transcribes audio buffer using the Whisper Large v3 Turbo worker on Cloudflare.
 * @param buffer - The raw binary audio data.
 * @returns The transcribed text.
 */
export async function transcribeAudio(buffer: Buffer): Promise<string> {
  // Check for required configuration
  if (!WHISPER_LARGE_V3_TURBO_WORKER_URL || !CLOUDFLARE_API_KEY) {
    throw new Error('Whisper configuration is missing.');
  }

  // Convert raw audio buffer to base64 string for transmission via JSON
  const audioBase64 = buffer.toString('base64');

  // Request transcription from the Whisper worker
  const response = await fetch(WHISPER_LARGE_V3_TURBO_WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
    },
    body: JSON.stringify({
      audio: audioBase64,
      task: 'transcribe', // Explicitly set task to transcription
      language: 'en', // Optimize for English language
    }),
  });

  // Handle potential API response errors
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper API error:', response.status, errorText);
    throw new Error(`Transcription failed: ${errorText}`);
  }

  // Parse the JSON result
  const data = (await response.json()) as {
    text: string;
    word_count?: number;
    error?: string;
  };

  // Check if the worker returned an internal error
  if (data.error) {
    throw new Error(`Whisper Worker Error: ${data.error}`);
  }

  // Return the resulting transcript
  return data.text || '';
}
