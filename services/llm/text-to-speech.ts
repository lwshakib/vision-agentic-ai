import { GoogleGenAI } from '@google/genai';
import { GOOGLE_API_KEY } from '@/lib/env';
import { TTS_MODEL_ID } from '@/lib/constants';
import { s3Service } from '@/services/s3.services';

/**
 * Helper to generate a standard RIFF/WAVE header for 24kHz 16-bit mono PCM data.
 */
function createWavHeader(pcmLength: number, sampleRate: number = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(pcmLength + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}

/**
 * Standalone Text-to-Speech logic using Gemini Native Audio.
 */
export async function textToSpeech(text: string, voice: string = 'Kore'): Promise<{ success: boolean; audioUrl: string }> {
  const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });

  const result = await genAI.models.generateContent({
    model: TTS_MODEL_ID,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseModalities: ['AUDIO'] as any,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      } as any,
    },
  });

  const data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error('Speech synthesis failed: No audio data returned');

  const pcmBuffer = Buffer.from(data, 'base64');
  const wavHeader = createWavHeader(pcmBuffer.length);
  const finalBuffer = Buffer.concat([wavHeader, pcmBuffer]);

  const key = `tts/audio-${Date.now()}.wav`;
  const audioUrl = await s3Service.uploadFile(finalBuffer, key, 'audio/wav');

  return { success: true, audioUrl };
}
