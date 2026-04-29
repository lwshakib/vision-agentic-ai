import { DeepgramClient } from '@deepgram/sdk';
import { DEEPGRAM_API_KEY } from '@/lib/env';
import { s3Service } from '@/services/s3.services';

/**
 * Standard RIFF/WAVE header for 48kHz 16-bit mono PCM data.
 * Includes placeholders for file and data sizes.
 */
function createWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(dataLength + 36, 4); // File size - 8
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(48000, 24); // Sample rate
  header.writeUInt32LE(48000 * 2, 28); // Byte rate
  header.writeUInt16LE(2, 32); // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40); // Data size
  return header;
}

/**
 * Deepgram Text-to-Speech service using Aura-2 models and the Live (WebSocket) API.
 */
export async function textToSpeech(
  text: string,
  voice: string = 'aura-2-orpheus-en'
): Promise<{ success: boolean; audioUrl: string }> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }

  const deepgram = new DeepgramClient(DEEPGRAM_API_KEY);

  return new Promise((resolve, reject) => {
    let audioBuffer = Buffer.alloc(0);

    const dgConnection = deepgram.speak.v1.connect({
      model: voice,
      encoding: 'linear16',
      sample_rate: 48000,
    });

    dgConnection.on('open', () => {
      console.log('[Deepgram] Connection opened');
      dgConnection.sendText({ type: 'Text', text });
    });

    dgConnection.on('message', async (data) => {
      if (data.type === 'Metadata') {
        // Metadata received
      } else if (data.type === 'Flushed') {
        console.log('[Deepgram] Synthesis flushed');
        
        try {
          const wavHeader = createWavHeader(audioBuffer.length);
          const finalBuffer = Buffer.concat([wavHeader, audioBuffer]);

          const key = `tts/audio-${Date.now()}.wav`;
          const audioUrl = await s3Service.uploadFile(finalBuffer, key, 'audio/wav');

          dgConnection.close();
          resolve({ success: true, audioUrl });
        } catch (error) {
          reject(error);
        }
      } else if (data instanceof Buffer) {
        // Binary audio chunk received
        audioBuffer = Buffer.concat([audioBuffer, data]);
      } else if (typeof data === 'string') {
        // Base64 audio chunk received (some environments return strings)
        const buffer = Buffer.from(data, 'base64');
        audioBuffer = Buffer.concat([audioBuffer, buffer]);
      }
    });

    dgConnection.on('close', () => {
      console.log('[Deepgram] Connection closed');
    });

    dgConnection.on('error', (err) => {
      console.error('[Deepgram] Error:', err);
      reject(err);
    });
  });
}
