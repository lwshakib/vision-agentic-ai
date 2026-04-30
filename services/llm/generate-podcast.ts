import { googleGenAi } from './client';
import { TTS_MODEL_ID } from './constants';
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
 * Multi-speaker Podcast Generation using Gemini TTS.
 */
export async function generatePodcast(
  transcript: string,
  speakers: { speaker: string; voice: string }[] = []
): Promise<{ success: boolean; audioUrl: string }> {
  try {
    // Gemini Multi-Speaker TTS requires EXACTLY 2 speaker configurations.
    let effectiveSpeakers = [...speakers];
    if (effectiveSpeakers.length === 0) {
      effectiveSpeakers = [
        { speaker: 'Host', voice: 'Puck' },
        { speaker: 'Guest', voice: 'Charon' },
      ];
    } else if (effectiveSpeakers.length === 1) {
      const first = effectiveSpeakers[0];
      const fallbackVoice = first.voice === 'Puck' ? 'Charon' : 'Puck';
      effectiveSpeakers.push({ speaker: 'Co-Host', voice: fallbackVoice });
    } else if (effectiveSpeakers.length > 2) {
      effectiveSpeakers = effectiveSpeakers.slice(0, 2);
    }

    const response = await googleGenAi.models.generateContent({
      model: TTS_MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      config: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseModalities: ['AUDIO'] as any,
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: effectiveSpeakers.map((s) => ({
              speaker: s.speaker,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: s.voice },
              },
            })),
          },
        } as any,
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error('Podcast synthesis failed: No audio data returned');

    const pcmBuffer = Buffer.from(data, 'base64');
    const wavHeader = createWavHeader(pcmBuffer.length);
    const finalBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    const key = `podcasts/audio-${Date.now()}.wav`;
    const audioUrl = await s3Service.uploadFile(finalBuffer, key, 'audio/wav');

    return { success: true, audioUrl };
  } catch (error) {
    console.error('Podcast Generation Error:', error);
    throw error;
  }
}
