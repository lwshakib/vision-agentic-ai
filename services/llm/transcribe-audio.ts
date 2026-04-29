import { CHAT_MODEL_ID } from '@/lib/constants';
import { googleGenAi } from './client';

/**
 * Transcribes audio using Gemini (Multimodal).
 * Note: Gemini can handle audio directly in generateContent.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const response = await googleGenAi.models.generateContent({
    model: CHAT_MODEL_ID,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Transcribe this audio exactly as spoken.' },
          {
            inlineData: {
              mimeType: 'audio/mpeg',
              data: audioBuffer.toString('base64'),
            },
          },
        ],
      },
    ],
  });

  return response.text || '';
}
